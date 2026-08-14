# Manual Accessibility Testing Guide for SessionLogger

This guide helps you manually verify all accessibility features are working correctly.

## Prerequisites
1. Open the workout tracking page in your browser
2. Start a workout session to access the SessionLogger component
3. Have a screen reader available (optional, for ARIA testing)

## Test Cases

### Test 1: Keyboard Navigation (Requirement 16.1)
**Expected**: All inputs and buttons should be reachable using Tab key

1. Load the SessionLogger component
2. Press Tab repeatedly
3. Verify focus moves in this order:
   - Weight input
   - Reps input  
   - RPE input
   - Log Set button
   - Previous/Next Exercise buttons

**Pass Criteria**: ✅ Can reach all interactive elements with Tab, no focus traps

---

### Test 2: Enter Key to Log Set (Requirement 16.2)
**Expected**: Pressing Enter while in an input should log the set

1. Enter values in Weight input: `100`
2. Tab to Reps input and enter: `10`
3. Press **Enter** key
4. Verify set is logged without clicking button

**Pass Criteria**: ✅ Set logged successfully, rest timer starts

---

### Test 3: Escape Key to Clear (Requirement 16.2)
**Expected**: Pressing Escape should clear all inputs

1. Enter values in Weight: `100`, Reps: `10`
2. Press **Escape** key
3. Verify all inputs are cleared

**Pass Criteria**: ✅ Weight and Reps fields are empty, RPE reset to 7

---

### Test 4: N Key for Next Exercise (Requirement 16.2)
**Expected**: Pressing 'n' (when not in input) should move to next exercise

1. Click outside any input field
2. Press **n** key
3. Verify exercise advances to next one

**Pass Criteria**: ✅ Exercise header changes to next exercise

---

### Test 5: P Key for Previous Exercise (Requirement 16.2)
**Expected**: Pressing 'p' should move to previous exercise

1. Ensure you're on exercise 2 or later
2. Click outside any input field
3. Press **p** key
4. Verify exercise goes back to previous one

**Pass Criteria**: ✅ Exercise header changes to previous exercise

---

### Test 6: S Key to Skip Rest Timer (Requirement 16.2)
**Expected**: Pressing 's' during rest should skip the timer

1. Log a set to start rest timer
2. Click outside any input field
3. Press **s** key while timer is counting down
4. Verify rest timer disappears

**Pass Criteria**: ✅ Rest timer stops and disappears immediately

---

### Test 7: ARIA Live Region Announcements (Requirement 16.3)
**Expected**: Screen reader announces important actions

1. Enable screen reader (VoiceOver: Cmd+F5 on Mac, NVDA: Ctrl+Alt+N on Windows)
2. Log a set
3. Listen for announcement like: "Set 1 logged: 100 kilograms for 10 repetitions at RPE 7"

**Pass Criteria**: ✅ Screen reader announces set completion

---

### Test 8: Focus Indicators Visible (Requirement 16.5)
**Expected**: Blue focus ring appears around focused elements

1. Tab to Weight input
2. Verify blue ring (2px) appears around the input
3. Tab to Reps input
4. Verify blue ring moves to new input
5. Tab to Log Set button
6. Verify blue ring appears around button

**Pass Criteria**: ✅ All focused elements show visible 2px blue ring

---

### Test 9: Dark Mode Focus Indicators (Requirement 16.5)
**Expected**: Focus indicators work in dark mode

1. Switch to dark mode (if available)
2. Repeat Test 8
3. Verify focus ring is still visible against dark background

**Pass Criteria**: ✅ Focus ring visible in both light and dark modes

---

### Test 10: Color Contrast (Requirement 16.4)
**Expected**: All text meets WCAG AA 4.5:1 contrast ratio

1. Open browser DevTools
2. Right-click any text element
3. Inspect element
4. Use DevTools accessibility panel to check contrast
5. Verify ratio is 4.5:1 or higher

**Pass Criteria**: ✅ All text meets minimum 4.5:1 contrast ratio

---

### Test 11: ARIA Labels Present (Requirement 16.3)
**Expected**: All inputs have proper labels for screen readers

1. Enable screen reader
2. Tab to Weight input
3. Verify screen reader says "Weight in kilograms"
4. Tab to Reps input
5. Verify screen reader says "Number of repetitions"
6. Tab to RPE input
7. Verify screen reader says "Rate of Perceived Exertion from 1 to 10"

**Pass Criteria**: ✅ All inputs have descriptive labels announced

---

### Test 12: Error Validation with ARIA (Requirement 16.3)
**Expected**: Invalid inputs marked with aria-invalid

1. Enter invalid weight: `10000` (exceeds max)
2. Enter valid reps: `10`
3. Click Log Set button
4. With screen reader, navigate to Weight input
5. Verify screen reader announces it's invalid

**Pass Criteria**: ✅ Screen reader indicates invalid state, error message shown

---

### Test 13: Keyboard Shortcuts Documentation Visible
**Expected**: Keyboard shortcuts panel is visible

1. Scroll to bottom of SessionLogger
2. Verify "Keyboard Shortcuts" section is visible
3. Verify it shows: Enter, Esc, N, P, S, Tab with descriptions

**Pass Criteria**: ✅ Shortcuts panel visible with all 6 shortcuts documented

---

## Summary Checklist

After completing all tests, verify:

- [ ] All interactive elements reachable with keyboard
- [ ] Enter logs set from input fields
- [ ] Escape clears inputs
- [ ] N/P navigate exercises
- [ ] S skips rest timer
- [ ] Screen reader announces actions
- [ ] Focus indicators visible (light mode)
- [ ] Focus indicators visible (dark mode)
- [ ] Text contrast meets WCAG AA
- [ ] ARIA labels present and correct
- [ ] Error states properly announced
- [ ] Keyboard shortcuts panel visible

## Tools Used
- Browser: Chrome/Firefox/Safari
- Screen Reader: NVDA/JAWS/VoiceOver
- Contrast Checker: Browser DevTools Accessibility Panel

## Issues Found
Document any accessibility issues discovered during testing:

1. [Issue description]
   - Steps to reproduce
   - Expected behavior
   - Actual behavior

---

**Test Date**: __________  
**Tester**: __________  
**Browser/Version**: __________  
**Screen Reader**: __________  
**Result**: PASS / FAIL
