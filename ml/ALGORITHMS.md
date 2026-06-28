# ML Pipeline — Algorithm Reference

This document is the technical reference for the food-recognition ML pipeline. It covers architecture selection, training strategy, loss and optimiser choices, macro estimation, known limitations, and future retraining.

---

## 1. Architecture Selection: Why EfficientNetV2-S

EfficientNetV2-S achieves ~84 % top-1 accuracy on ImageNet-1K with ~20 M parameters and significantly faster training speed than its larger variants, thanks to Fused-MBConv blocks in the early network stages. It was chosen over the following alternatives:

| Alternative | Reason rejected |
|---|---|
| **EfficientNetV2-M** | Approximately 2× slower training and ~85 M more floating-point operations per forward pass, with only marginal accuracy improvement on a 101-class problem — the cost-to-benefit ratio does not justify the extra compute. |
| **ResNet-50** | Based on older compound-scaling rules; EfficientNetV2-S achieves consistently higher accuracy per FLOP at this parameter scale due to its progressive learning and Fused-MBConv design. |
| **ViT-B/16** | Attention-only architectures require much larger datasets and longer pre-training schedules to converge. Food-101 (101K images across 101 categories) is too small for ViT-B/16 to outperform CNNs without either heavy augmentation or a much larger pre-training corpus. |

---

## 2. Two-Phase Training (`Two_Phase_Training`)

Training proceeds in two sequential phases to avoid corrupting the ImageNet-pretrained features before the new classification head has converged.

### Phase 1 — Frozen backbone (head only)

**Rationale:** The EfficientNetV2-S backbone arrives with rich, general-purpose visual features learned from 1.2 M ImageNet images. Updating those weights from random head gradients in the first few epochs risks catastrophic interference. Freezing all backbone parameters (`requires_grad = False`) confines updates exclusively to the newly attached linear head, allowing it to map the pretrained feature space to the 101 Food-101 classes before any backbone fine-tuning begins.

- **Learning rate:** `1e-3`
- **Epochs:** 5
- **Optimiser:** Adam with weight decay `1e-4`
- **Loss:** CrossEntropyLoss

### Phase 2 — Full fine-tuning

Once the head has converged, all backbone parameters are unfrozen (`requires_grad = True`) and the entire network is fine-tuned end-to-end.

- **Learning rate:** `1e-4` (exactly 1/10 of the phase 1 rate)
- **Scheduler:** CosineAnnealingLR — smoothly decays the learning rate from `1e-4` toward 0 following a cosine curve over 10 epochs, avoiding abrupt drops and helping the model settle into a better minimum.
- **Epochs:** 10 scheduled, plus up to 50 extra epochs in 5-epoch increments if the 85 % top-1 accuracy threshold is not yet met.

The reduced phase 2 learning rate is deliberate: large updates at this stage would destroy the features learned in phase 1 and destabilise the backbone weights.

---

## 3. Loss Function and Optimiser

### CrossEntropyLoss

CrossEntropyLoss is the standard objective for multi-class classification. It combines a log-softmax transformation of the model's raw logits with negative log-likelihood, and optimises the model to assign maximum probability mass to the correct Food-101 category. The loss is minimised when the predicted probability distribution concentrates on the ground-truth label.

### Adam with Weight Decay

Adam (Adaptive Moment Estimation) maintains per-parameter running estimates of both the first moment (mean gradient) and second moment (uncentred variance). This allows it to apply an effective per-parameter learning rate, which speeds convergence compared with plain SGD, particularly in the early head-training epochs where gradients vary widely across parameters.

**Weight decay value:** `1e-4`

Weight decay adds an L2 penalty proportional to the magnitude of each parameter to the effective loss. This regularises both the head and, in phase 2, the backbone weights, reducing overfitting to the training split.

### Role of Food-101

Food-101 is the training corpus: 75,750 training images and 25,250 test images across 101 food categories. CrossEntropyLoss is computed over this labelled dataset — the model receives a training image, predicts a probability distribution over the 101 classes, and the loss measures how far that distribution deviates from the one-hot ground-truth label. The Food-101 test split is used exclusively for top-1 accuracy evaluation; it never influences gradient updates.

---

## 4. Macro Estimation Pipeline

Given a food image, macros are estimated in three ordered steps:

1. **Classifier output → category label**  
   The EfficientNetV2-S model produces a 101-dimensional logit vector. A softmax converts these to probabilities; the index of the highest probability is mapped to the corresponding Food-101 category name (e.g., `"pizza"`). This is the top-1 label.

2. **Category label → Nutrition_DB lookup**  
   The category name is used as a key into `nutrition_db.json` (Nutrition_DB). Each entry stores the per-100 g macronutrient values (`calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`) and a fixed `serving_size` in grams sourced from the USDA FoodData Central API.

3. **Per-100 g values × (serving_size / 100) → displayed macros**  
   Each macro is scaled from the per-100 g baseline to the documented serving size using the formula:

   ```
   displayed_macro = round(per_100g_value × (serving_size / 100), 2)
   ```

   For example, if pizza has 266 kcal per 100 g and a serving size of 107 g, the displayed calories are `round(266 × 1.07, 2) = 284.62 kcal`.

---

## 5. Known Limitations

| Limitation | Description |
|---|---|
| **Fixed serving sizes** | Serving sizes in Nutrition_DB are fixed integer gram weights recorded once from USDA data. Actual portion sizes vary considerably; the pipeline cannot account for a half-slice versus a whole pie. |
| **101-category scope** | The classifier is trained exclusively on the 101 Food-101 categories. Foods outside this set (e.g., regional dishes, novel products) will be misclassified as the nearest Food-101 category with no out-of-distribution signal beyond the confidence score. |
| **Confidence threshold heuristic** | The 50 % threshold for the `low_confidence` flag is a fixed heuristic, not a calibrated probability. A model can be confidently wrong (high-confidence incorrect prediction) or correctly uncertain below 50 %; neither case is detected by the threshold alone. |

---

## 6. Future Correction-Based Retraining

User corrections are the primary mechanism for improving the classifier over time. Each correction captured from the production app should include the following data items:

| Data item | Description |
|---|---|
| `original_image` | The image file that was analysed (the exact bytes uploaded to the inference server). |
| `corrected_label` | The Food-101 category name the user selected as the correct classification. |
| `confidence_score` | The top-1 confidence score (0–1 float) returned by the model at the time of the original prediction. |

### Retraining trigger

A minimum of **50 corrections** should accumulate before a retraining run is initiated. Below this threshold the signal-to-noise ratio is insufficient to produce reliable gradient updates without risking overfitting to a small correction batch.

### Output format of the assembled retraining dataset

The assembled correction dataset is written in the following format before being fed into `train.py`:

- **Labelled image directory** — a flat directory (e.g., `ml/corrections/images/`) containing the original image files, named by a stable identifier (e.g., UUID).
- **CSV manifest** — a file (e.g., `ml/corrections/manifest.csv`) with one row per correction, containing at minimum the columns: `image_filename`, `corrected_label`, `confidence_score`.

This format is compatible with a custom `torch.utils.data.Dataset` that reads the manifest and loads images from the accompanying directory, allowing the correction batch to be mixed with the original Food-101 training split during the next retraining run.
