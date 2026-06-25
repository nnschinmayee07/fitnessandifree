import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Comment {
  id: number;
  user: string;
  avatar: string;
  text: string;
  time: string;
  isOwn?: boolean;
}

export interface CommunityPost {
  id: number;
  user: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
  comments: number;
  liked: boolean;
  isOwn?: boolean;
  commentList: Comment[];
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  participants: number;
  daysLeft: number;
  joined: boolean;
  progress: number;
  category: "nutrition" | "fitness" | "wellness";
}

interface CommunityState {
  posts: CommunityPost[];
  challenges: Challenge[];
  toggleLike: (postId: number) => void;
  addComment: (postId: number, text: string, user: string, avatar: string) => void;
  editComment: (postId: number, commentId: number, text: string) => void;
  deleteComment: (postId: number, commentId: number) => void;
  joinChallenge: (challengeId: number) => void;
  leaveChallenge: (challengeId: number) => void;
  updateProgress: (challengeId: number, progress: number) => void;
  addPost: (text: string, user: string, avatar: string) => void;
  editPost: (postId: number, text: string) => void;
  deletePost: (postId: number) => void;
}

const DEFAULT_POSTS: CommunityPost[] = [
  {
    id: 1, user: "Priya S.", avatar: "PS", time: "2h ago",
    text: "Hit a new PR on bench press today — 70 kg! Six months ago I couldn't lift 40. Consistency really is everything.",
    likes: 42, comments: 2, liked: false,
    commentList: [
      { id: 101, user: "Rahul M.", avatar: "RM", time: "1h ago", text: "That is incredible! Keep crushing it." },
      { id: 102, user: "Kiran T.", avatar: "KT", time: "45m ago", text: "So inspiring. You made my day!" },
    ],
  },
  {
    id: 2, user: "Rahul M.", avatar: "RM", time: "4h ago",
    text: "Week 8 of the 12-week program done. Down 3.2 kg and feeling stronger. If you're thinking about starting, just start.",
    likes: 67, comments: 1, liked: true,
    commentList: [
      { id: 201, user: "Meera R.", avatar: "MR", time: "3h ago", text: "Week 8 already! You are flying. 🔥" },
    ],
  },
  {
    id: 3, user: "Kiran T.", avatar: "KT", time: "6h ago",
    text: "Meal prepped for the whole week. Grilled chicken, brown rice, roasted veggies. Sunday afternoons well spent.",
    likes: 29, comments: 0, liked: false,
    commentList: [],
  },
  {
    id: 4, user: "Meera R.", avatar: "MR", time: "8h ago",
    text: "First time running 5K without stopping. Took me 3 months but I did it. Never thought I'd be a runner.",
    likes: 91, comments: 1, liked: false,
    commentList: [
      { id: 401, user: "Priya S.", avatar: "PS", time: "7h ago", text: "This is huge! Congrats Meera!" },
    ],
  },
];

const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: 1, name: "30-Day Protein Challenge",
    description: "Hit your daily protein goal every day for 30 days.",
    participants: 2847, daysLeft: 18, joined: true, progress: 40,
    category: "nutrition",
  },
  {
    id: 2, name: "10K Steps Daily",
    description: "Walk or run 10,000 steps every single day.",
    participants: 5123, daysLeft: 22, joined: false, progress: 0,
    category: "fitness",
  },
  {
    id: 3, name: "Sugar-Free July",
    description: "Cut out added sugar for the entire month.",
    participants: 1204, daysLeft: 5, joined: true, progress: 83,
    category: "nutrition",
  },
  {
    id: 4, name: "7-Day Hydration Reset",
    description: "Drink 3L of water every day for a week.",
    participants: 3410, daysLeft: 7, joined: false, progress: 0,
    category: "wellness",
  },
  {
    id: 5, name: "Morning Workout Streak",
    description: "Complete a workout before 9AM for 14 days straight.",
    participants: 891, daysLeft: 12, joined: false, progress: 0,
    category: "fitness",
  },
];

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      posts: DEFAULT_POSTS,
      challenges: DEFAULT_CHALLENGES,

      toggleLike: (postId) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
              : p
          ),
        })),

      addComment: (postId, text, user, avatar) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments + 1,
                  commentList: [
                    ...p.commentList,
                    { id: Date.now(), user, avatar, text, time: "just now", isOwn: true },
                  ],
                }
              : p
          ),
        })),

      editComment: (postId, commentId, text) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  commentList: p.commentList.map((c) =>
                    c.id === commentId ? { ...c, text } : c
                  ),
                }
              : p
          ),
        })),

      deleteComment: (postId, commentId) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: Math.max(0, p.comments - 1),
                  commentList: p.commentList.filter((c) => c.id !== commentId),
                }
              : p
          ),
        })),

      joinChallenge: (id) =>
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === id ? { ...c, joined: true, participants: c.participants + 1 } : c
          ),
        })),

      leaveChallenge: (id) =>
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === id ? { ...c, joined: false, participants: c.participants - 1, progress: 0 } : c
          ),
        })),

      updateProgress: (id, progress) =>
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === id ? { ...c, progress: Math.min(100, Math.max(0, progress)) } : c
          ),
        })),

      addPost: (text, user, avatar) =>
        set((s) => ({
          posts: [
            {
              id: Date.now(),
              user, avatar,
              time: "just now",
              text,
              likes: 0, comments: 0,
              liked: false, isOwn: true,
              commentList: [],
            },
            ...s.posts,
          ],
        })),

      editPost: (postId, text) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === postId ? { ...p, text } : p)),
        })),

      deletePost: (postId) =>
        set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) })),
    }),
    { name: "fitnessandi-community" }
  )
);
