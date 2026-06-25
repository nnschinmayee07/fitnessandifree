"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useUserStore } from "@/lib/store/user";
import { useCommunityStore, type Challenge, type CommunityPost, type Comment } from "@/lib/store/community";

const catColor: Record<string, string> = {
  nutrition: "#22C55E", fitness: "#3B82F6", wellness: "#A78BFA",
};

/* ── Share sheet ── */
function ShareSheet({ post, onClose }: { post: CommunityPost; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `https://fitnessandi.app/community/${post.id}`;
  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(onClose, 1200);
  };
  const options = [
    { label: "Copy link", action: copy, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7.5 10.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L8 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10.5 7.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
    { label: "WhatsApp", action: onClose, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="#25D366" strokeWidth="1.4"/><path d="M5.5 6.5c.2-.5.8-1 1.3-.8.4.1.6.6.8 1 .1.3 0 .6-.2.8l-.4.3a5 5 0 002.2 2.1l.3-.4c.2-.2.5-.3.8-.2.4.2.9.4 1 .8.2.5-.3 1.1-.8 1.3A4.5 4.5 0 015.5 6.5z" stroke="#25D366" strokeWidth="1.2" strokeLinecap="round"/></svg> },
    { label: "Instagram", action: onClose, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="13" height="13" rx="4" stroke="#E1306C" strokeWidth="1.4"/><circle cx="9" cy="9" r="3" stroke="#E1306C" strokeWidth="1.4"/><circle cx="13" cy="5" r="0.8" fill="#E1306C"/></svg> },
    { label: "More options", action: onClose, icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="5" r="1.2" fill="var(--color-text-2)"/><circle cx="9" cy="9" r="1.2" fill="var(--color-text-2)"/><circle cx="9" cy="13" r="1.2" fill="var(--color-text-2)"/></svg> },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg rounded-t-[24px] pb-8 pt-5"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="w-10 h-1 rounded-full bg-[var(--color-border)] mx-auto mb-4"/>
        <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide px-5 mb-4">SHARE POST</p>
        {/* Post preview */}
        <div className="mx-5 mb-4 p-3 rounded-[12px] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="font-body font-bold text-[12px] text-[var(--color-text-1)]">{post.user}</p>
          <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mt-0.5 line-clamp-2">{post.text}</p>
        </div>
        {/* URL bar */}
        <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <span className="font-caption text-[10px] font-light text-[var(--color-text-3)] flex-1 truncate">{url}</span>
          <button onClick={copy} className="flex-shrink-0 h-7 px-3 rounded-[7px] bg-[var(--color-primary)] text-white font-caption text-[10px] font-light">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 px-5">
          {options.map(o => (
            <button key={o.label} onClick={o.action}
              className="flex flex-col items-center gap-1.5 py-3 rounded-[12px] bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all"
              style={{ color: "var(--color-text-2)" }}>
              {o.icon}
              <span className="font-caption text-[8px] font-light text-center leading-tight">{o.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Comment item ── */
function CommentItem({ postId, comment }: { postId: number; comment: Comment }) {
  const { editComment, deleteComment } = useCommunityStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const save = () => { editComment(postId, comment.id, draft.trim()); setEditing(false); };
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      className="flex gap-2.5 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-primary-mid)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="font-heading text-[8px] text-[var(--color-primary)]">{comment.avatar}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-body font-bold text-[11px] text-[var(--color-text-1)]">{comment.user}</span>
          <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{comment.time}</span>
          {comment.isOwn && (
            <div className="relative ml-auto">
              <button onClick={() => setMenuOpen(v => !v)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-surface-2)]">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="2" r="0.8" fill="var(--color-text-3)"/>
                  <circle cx="5" cy="5" r="0.8" fill="var(--color-text-3)"/>
                  <circle cx="5" cy="8" r="0.8" fill="var(--color-text-3)"/>
                </svg>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.88, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88 }} transition={{ duration: 0.12 }}
                    className="absolute right-0 top-6 z-20 rounded-[10px] shadow-lg overflow-hidden"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", minWidth: 100 }}>
                    <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6.5 1.5l2 2L2 10H0V8L6.5 1.5z" stroke="var(--color-text-2)" strokeWidth="1" strokeLinecap="round"/></svg>
                      <span className="font-body text-[11px] text-[var(--color-text-1)]">Edit</span>
                    </button>
                    <button onClick={() => { deleteComment(postId, comment.id); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-[var(--color-danger-light)]">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 2.5h8M3.5 2.5V1.5h3v1M4 4v4M6 4v4M2 2.5l.5 6h5l.5-6" stroke="#EF4444" strokeWidth="1" strokeLinecap="round"/></svg>
                      <span className="font-body text-[11px] text-[#EF4444]">Delete</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        {editing ? (
          <div className="mt-1 flex gap-2">
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 h-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 font-body text-[11px] text-[var(--color-text-1)] focus:border-[#2563EB] focus:outline-none"/>
            <button onClick={save} className="h-8 px-3 rounded-[8px] bg-[#2563EB] text-white font-caption text-[9px] font-light">Save</button>
            <button onClick={() => setEditing(false)} className="h-8 px-2 rounded-[8px] border border-[var(--color-border)] font-caption text-[9px] font-light text-[var(--color-text-2)]">Cancel</button>
          </div>
        ) : (
          <p className="font-body text-[12px] text-[var(--color-text-2)] mt-0.5 leading-relaxed">{comment.text}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Post card with comments + share ── */
function PostCard({ post }: { post: CommunityPost }) {
  const { name, avatar } = useUserStore();
  const { toggleLike, deletePost, addComment, editPost } = useCommunityStore();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(post.text);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOwn = post.isOwn || post.user === name;

  const submitComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim(), name || "You", avatar || "ME");
    setCommentText("");
  };

  const openComments = () => {
    setCommentsOpen(v => !v);
    if (!commentsOpen) setTimeout(() => inputRef.current?.focus(), 200);
  };

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.22 }}>
        <GlowCard glowColor="37,99,235">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] border-2 border-[var(--color-primary-mid)] flex items-center justify-center flex-shrink-0">
                <span className="font-heading text-[11px] text-[var(--color-primary)]">{post.avatar}</span>
              </div>
              <div className="flex-1">
                <p className="font-body font-bold text-[13px] text-[var(--color-text-1)]">{post.user}</p>
                <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">{post.time}</p>
              </div>
              {isOwn && (
                <div className="relative">
                  <button onClick={() => setMenuOpen(v => !v)}
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="3" r="1" fill="var(--color-text-3)"/>
                      <circle cx="7" cy="7" r="1" fill="var(--color-text-3)"/>
                      <circle cx="7" cy="11" r="1" fill="var(--color-text-3)"/>
                    </svg>
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.14 }}
                        className="absolute right-0 top-8 z-20 rounded-[12px] overflow-hidden shadow-lg"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", minWidth: 120 }}>
                        <button onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-3 hover:bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 1.5l2.5 2.5L3 11.5H.5V9L8 1.5z" stroke="var(--color-text-2)" strokeWidth="1.1" strokeLinecap="round"/></svg>
                          <span className="font-body text-[12px] text-[var(--color-text-1)]">Edit</span>
                        </button>
                        <button onClick={() => { setDeleteConfirm(true); setMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-3 hover:bg-[var(--color-danger-light)]">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 3h9M4.5 3V2h3v1M5 5v4M7 5v4M2.5 3l.5 7h6l.5-7" stroke="#EF4444" strokeWidth="1.1" strokeLinecap="round"/></svg>
                          <span className="font-body text-[12px] text-[#EF4444]">Delete</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Delete confirm */}
            <AnimatePresence>
              {deleteConfirm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                  <div className="rounded-[10px] border border-[#FECACA] bg-[var(--color-danger-light)] p-3">
                    <p className="font-body text-[12px] text-[#EF4444] mb-2">Delete this post?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteConfirm(false)}
                        className="flex-1 h-8 rounded-[8px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body text-[11px]">Cancel</button>
                      <button onClick={() => deletePost(post.id)}
                        className="flex-1 h-8 rounded-[8px] bg-[#EF4444] text-white font-body text-[11px]">Delete</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Edit inline */}
            <AnimatePresence>
              {editOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                  <textarea autoFocus value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={3}
                    className="w-full rounded-[10px] border border-[#2563EB] bg-[var(--color-surface-2)] px-3 py-2.5 font-body text-[13px] text-[var(--color-text-1)] resize-none focus:outline-none"/>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditOpen(false)}
                      className="flex-1 h-9 rounded-[9px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body text-[12px]">Cancel</button>
                    <button onClick={() => { editPost(post.id, editDraft); setEditOpen(false); }}
                      className="flex-1 h-9 rounded-[9px] bg-[#2563EB] text-white font-body text-[12px]">Save</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body */}
            {!editOpen && <p className="font-body text-[13px] text-[var(--color-text-2)] leading-relaxed mb-3">{post.text}</p>}

            {/* Action bar */}
            <div className="flex items-center gap-1 border-t border-[var(--color-border)] pt-3">
              {/* Like */}
              <motion.button whileTap={{ scale: 0.82 }} onClick={() => toggleLike(post.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] transition-colors ${post.liked ? "text-[#EF4444] bg-[#EF444410]" : "text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"}`}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 13S1 9 1 4.8C1 2.7 2.7 1 4.8 1c.9 0 1.9.4 2.7 1.2C8.3 1.4 9.2 1 10.2 1 12.3 1 14 2.7 14 4.8 14 9 7.5 13 7.5 13z"
                    stroke="currentColor" strokeWidth="1.3" fill={post.liked ? "currentColor" : "none"} strokeLinecap="round"/>
                </svg>
                <span className="font-caption text-[11px] font-light">{post.likes}</span>
              </motion.button>

              {/* Comment */}
              <button onClick={openComments}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] transition-colors ${commentsOpen ? "text-[var(--color-primary)] bg-[var(--color-primary-light)]" : "text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"}`}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 2h11a1 1 0 011 1v6a1 1 0 01-1 1H5.5l-3.5 2V3a1 1 0 011-1z"
                    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-caption text-[11px] font-light">{post.comments}</span>
              </button>

              {/* Share */}
              <button onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] transition-colors">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <circle cx="3" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M4.4 6.5l6.2-2.5M4.4 8.5l6.2 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span className="font-caption text-[11px] font-light">Share</span>
              </button>

              {/* Kudos / Bookmark */}
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] transition-colors ml-auto">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3 2h9a1 1 0 011 1v10l-4.5-3L4 13V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Comments section */}
            <AnimatePresence>
              {commentsOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
                  className="overflow-hidden">
                  <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
                    {/* Existing comments */}
                    {post.commentList.length > 0 && (
                      <div className="flex flex-col mb-3">
                        <AnimatePresence>
                          {post.commentList.map(c => (
                            <CommentItem key={c.id} postId={post.id} comment={c}/>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                    {post.commentList.length === 0 && (
                      <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] text-center py-2 mb-2">
                        No comments yet. Be the first!
                      </p>
                    )}
                    {/* Add comment */}
                    <div className="flex gap-2 items-center">
                      <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-primary-mid)] flex items-center justify-center flex-shrink-0">
                        <span className="font-heading text-[8px] text-[var(--color-primary)]">{avatar || "ME"}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 focus-within:border-[#2563EB] transition-colors">
                        <input ref={inputRef} value={commentText} onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") submitComment(); }}
                          placeholder="Add a comment…"
                          className="flex-1 bg-transparent font-body text-[12px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:outline-none"/>
                        <AnimatePresence>
                          {commentText.trim() && (
                            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }} onClick={submitComment}
                              className="flex-shrink-0">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M14 8H3M14 8L9 3M14 8L9 13" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlowCard>
      </motion.div>

      <AnimatePresence>
        {shareOpen && <ShareSheet post={post} onClose={() => setShareOpen(false)}/>}
      </AnimatePresence>
    </>
  );
}

/* ── New Post Modal ── */
function NewPostModal({ onClose }: { onClose: () => void }) {
  const { name, avatar } = useUserStore();
  const addPost = useCommunityStore((s) => s.addPost);
  const [text, setText] = useState("");
  const post = () => {
    if (!text.trim()) return;
    addPost(text.trim(), name || "You", avatar || "ME");
    onClose();
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md rounded-[20px] overflow-hidden flex flex-col"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <p className="font-heading text-[1rem] text-[var(--color-text-1)] tracking-wide">NEW POST</p>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="var(--color-text-2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] border-2 border-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
              <span className="font-heading text-[12px] text-[var(--color-primary)]">{avatar || "ME"}</span>
            </div>
            <div>
              <p className="font-body font-bold text-[13px] text-[var(--color-text-1)]">{name || "You"}</p>
              <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">Posting to community</p>
            </div>
          </div>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value.slice(0, 300))}
            placeholder="Share your progress, a win, or some motivation…"
            rows={4}
            className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 font-body text-[13px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] resize-none focus:border-[#2563EB] focus:outline-none transition-colors"/>
          <p className="font-caption text-[10px] font-light text-right mt-1"
            style={{ color: text.length > 260 ? "#EF4444" : "var(--color-text-3)" }}>
            {text.length}/300
          </p>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body font-bold text-[13px]">Cancel</button>
          <button onClick={post} disabled={!text.trim()}
            className="flex-1 h-11 rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] disabled:opacity-40 hover:bg-[#1D4ED8] transition-colors">
            Post
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Challenge progress modal ── */
function ProgressModal({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  const { updateProgress, leaveChallenge } = useCommunityStore();
  const [val, setVal] = useState(String(challenge.progress));
  const save = () => { updateProgress(challenge.id, Number(val)); onClose(); };
  const leave = () => { leaveChallenge(challenge.id); onClose(); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md rounded-[20px] overflow-hidden"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <p className="font-heading text-[1rem] text-[var(--color-text-1)] tracking-wide">UPDATE PROGRESS</p>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="var(--color-text-2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="font-body font-bold text-[14px] text-[var(--color-text-1)]">{challenge.name}</p>
            <p className="font-caption text-[11px] font-light text-[var(--color-text-3)] mt-0.5">{challenge.description}</p>
          </div>
          <div>
            <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] uppercase tracking-wider block mb-2">Progress (%)</label>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={val} onChange={e => setVal(e.target.value)} className="flex-1 accent-[#2563EB]"/>
              <span className="font-metric text-[1.25rem] text-[var(--color-primary)] w-12 text-right">{val}%</span>
            </div>
            <div className="h-2 bg-[var(--color-border)] rounded-full mt-2 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: "#22C55E" }}/>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={leave} className="h-11 px-4 rounded-[12px] border border-[#FECACA] text-[#EF4444] font-body font-bold text-[12px] hover:bg-[var(--color-danger-light)] transition-colors">Leave</button>
            <button onClick={save} className="flex-1 h-11 rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] hover:bg-[#1D4ED8] transition-colors">Save Progress</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Challenge card ── */
function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { joinChallenge } = useCommunityStore();
  const [progressOpen, setProgressOpen] = useState(false);
  const color = catColor[challenge.category] || "#3B82F6";
  const glowRgb = challenge.category === "nutrition" ? "34,197,94" : challenge.category === "wellness" ? "167,139,250" : "37,99,235";
  return (
    <>
      <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.16 }}>
        <GlowCard glowColor={glowRgb}>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="font-caption text-[9px] font-light px-1.5 py-0.5 rounded-full border"
                  style={{ color, borderColor: color + "40", background: color + "14" }}>
                  {challenge.category}
                </span>
                <p className="font-body font-bold text-[13px] text-[var(--color-text-1)] mt-1.5">{challenge.name}</p>
                <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mt-0.5 leading-snug">{challenge.description}</p>
                <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mt-1">
                  {challenge.participants.toLocaleString()} participants · {challenge.daysLeft}d left
                </p>
              </div>
              {challenge.joined ? (
                <button onClick={() => setProgressOpen(true)}
                  className="h-8 px-3 rounded-[8px] border-2 font-body font-bold text-[11px] flex-shrink-0 transition-all"
                  style={{ borderColor: "#22C55E", color: "#22C55E", background: "#22C55E14" }}>
                  Update
                </button>
              ) : (
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => joinChallenge(challenge.id)}
                  className="h-8 px-3 rounded-[8px] border-2 border-[var(--color-primary)] font-body font-bold text-[11px] text-[var(--color-primary)] flex-shrink-0 hover:bg-[var(--color-primary-light)] transition-all">
                  Join
                </motion.button>
              )}
            </div>
            {challenge.joined && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">Your progress</span>
                  <span className="font-caption text-[9px] font-light" style={{ color: "#22C55E" }}>{challenge.progress}%</span>
                </div>
                <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: "#22C55E" }}
                    initial={{ width: 0 }} animate={{ width: `${challenge.progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}/>
                </div>
              </div>
            )}
          </div>
        </GlowCard>
      </motion.div>
      <AnimatePresence>
        {progressOpen && <ProgressModal challenge={challenge} onClose={() => setProgressOpen(false)}/>}
      </AnimatePresence>
    </>
  );
}

/* ── Main page ── */
export default function CommunityPage() {
  const { posts, challenges } = useCommunityStore();
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [tab, setTab] = useState<"feed" | "challenges">("feed");
  const [filter, setFilter] = useState<"all" | "joined">("all");
  const joinedCount = challenges.filter(c => c.joined).length;
  const visibleChallenges = filter === "joined" ? challenges.filter(c => c.joined) : challenges;

  return (
    <div className="flex flex-col">
      <PageHeader title="COMMUNITY"
        action={
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setNewPostOpen(true)}
            className="w-8 h-8 rounded-[8px] bg-[var(--color-primary)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.75" strokeLinecap="round"/></svg>
          </motion.button>
        }
      />
      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Tab switcher */}
        <ScrollReveal direction="up">
          <div className="flex gap-2 p-1 rounded-[14px] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            {(["feed", "challenges"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 h-9 rounded-[10px] font-body font-bold text-[12px] transition-all relative"
                style={{ background: tab === t ? "var(--color-primary)" : "transparent", color: tab === t ? "white" : "var(--color-text-2)" }}>
                {t === "challenges" && joinedCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full bg-[#22C55E] text-white text-[8px] font-bold flex items-center justify-center">
                    {joinedCount}
                  </span>
                )}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <AnimatePresence mode="wait">
          {tab === "feed" && (
            <motion.div key="feed" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3">
              <ScrollReveal direction="up">
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setNewPostOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span className="font-body text-[13px] text-[var(--color-text-3)]">Share your progress or a win…</span>
                </motion.button>
              </ScrollReveal>
              <AnimatePresence>
                {posts.map(p => (
                  <ScrollReveal key={p.id} direction="up">
                    <PostCard post={p}/>
                  </ScrollReveal>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {tab === "challenges" && (
            <motion.div key="challenges" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3">
              <ScrollReveal direction="up">
                <div className="flex gap-2">
                  {(["all", "joined"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className="h-8 px-4 rounded-full border font-caption text-[10px] font-light transition-all"
                      style={{
                        background: filter === f ? "var(--color-primary)" : "var(--color-surface-2)",
                        borderColor: filter === f ? "var(--color-primary)" : "var(--color-border)",
                        color: filter === f ? "white" : "var(--color-text-2)",
                      }}>
                      {f === "all" ? `All (${challenges.length})` : `Joined (${joinedCount})`}
                    </button>
                  ))}
                </div>
              </ScrollReveal>
              <AnimatePresence>
                {visibleChallenges.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center py-12 gap-3">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" stroke="var(--color-border)" strokeWidth="2"/><path d="M13 20h14M20 13v14" stroke="var(--color-text-4)" strokeWidth="2" strokeLinecap="round"/></svg>
                    <p className="font-body text-[13px] text-[var(--color-text-3)]">No joined challenges yet</p>
                    <button onClick={() => setFilter("all")} className="h-9 px-5 rounded-full bg-[var(--color-primary)] text-white font-body font-bold text-[12px]">Browse All</button>
                  </motion.div>
                ) : visibleChallenges.map(c => (
                  <ScrollReveal key={c.id} direction="up">
                    <ChallengeCard challenge={c}/>
                  </ScrollReveal>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {newPostOpen && <NewPostModal onClose={() => setNewPostOpen(false)}/>}
      </AnimatePresence>
    </div>
  );
}
