import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";

interface Comment {
  id?: string;
  _id?: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: string;
}

interface Destination {
  _id: string;
  name: string;
  slug: string;
}

interface User {
  _id: string;
  name: string;
  avatar: string | null;
}

export interface Story {
  id?: string;
  _id?: string;
  userId: User;
  destinationId: Destination;
  rating: number;
  title: string;
  review: string;
  images: string[];
  likes: string[];
  saves: string[];
  comments: Comment[];
  createdAt: string;
}

interface StoryModalProps {
  story: Story;
  onClose: () => void;
  currentUserId?: string;
  onUpdate: (updatedStory: Story) => void;
}

export function StoryModal({ story, onClose, currentUserId, onUpdate }: StoryModalProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const hasLiked = currentUserId ? story.likes.includes(currentUserId) : false;
  const hasSaved = currentUserId ? story.saves.includes(currentUserId) : false;

  const handleLike = async () => {
    if (!currentUserId) return alert("Please log in to like this story.");
    const storyId = story.id || story._id || "";
    
    if (storyId.startsWith("fallback-")) {
      const newLikes = hasLiked ? story.likes.filter(id => id !== currentUserId) : [...story.likes, currentUserId];
      onUpdate({ ...story, likes: newLikes });
      return;
    }

    const res = await apiFetch<{ review: Story }>(`/v1/reviews/${storyId}/like`, { method: "POST" }).catch(console.error);
    if (res && res.review) {
      onUpdate({ ...story, likes: res.review.likes });
    }
  };

  const handleSave = async () => {
    if (!currentUserId) return alert("Please log in to save this story.");
    const storyId = story.id || story._id || "";

    if (storyId.startsWith("fallback-")) {
      const newSaves = hasSaved ? story.saves.filter(id => id !== currentUserId) : [...story.saves, currentUserId];
      onUpdate({ ...story, saves: newSaves });
      return;
    }

    const res = await apiFetch<{ review: Story }>(`/v1/reviews/${storyId}/save`, { method: "POST" }).catch(console.error);
    if (res && res.review) {
      onUpdate({ ...story, saves: res.review.saves });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/destination/${story.destinationId.slug}`);
    alert("Link copied to clipboard!");
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return alert("Please log in to comment.");
    if (!commentText.trim()) return;
    
    const storyId = story.id || story._id || "";
    if (storyId.startsWith("fallback-")) {
      const newComment = {
        _id: Math.random().toString(),
        userId: currentUserId,
        userName: "You",
        userAvatar: null,
        text: commentText,
        createdAt: new Date().toISOString()
      };
      onUpdate({ ...story, comments: [...(story.comments || []), newComment] });
      setCommentText("");
      return;
    }

    setIsSubmitting(true);
    const res = await apiFetch<{ review: Story }>(`/v1/reviews/${storyId}/comment`, { 
      method: "POST", 
      body: JSON.stringify({ text: commentText }) 
    }).catch(console.error);
    
    setIsSubmitting(false);
    if (res && res.review) {
      onUpdate({ ...story, comments: res.review.comments });
      setCommentText("");
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl md:flex-row"
          style={{ maxHeight: '90vh' }}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100/80 text-stone-600 backdrop-blur-md transition hover:bg-stone-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>

          {/* Left Column: Image Gallery */}
          <div className="relative h-64 w-full bg-stone-900 md:h-auto md:w-3/5">
            {story.images.length > 0 ? (
              <>
                <img 
                  src={story.images[activeImage]} 
                  alt="Traveller Moment" 
                  className="h-full w-full object-cover"
                />
                
                {story.images.length > 1 && (
                  <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
                    {story.images.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setActiveImage(i)}
                        className={`h-2 rounded-full transition-all ${i === activeImage ? "w-8 bg-white" : "w-2 bg-white/50"}`}
                      />
                    ))}
                  </div>
                )}
                
                {story.images.length > 1 && activeImage > 0 && (
                  <button onClick={() => setActiveImage(i => i - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                  </button>
                )}
                {story.images.length > 1 && activeImage < story.images.length - 1 && (
                  <button onClick={() => setActiveImage(i => i + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </button>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-stone-500">No Image Provided</div>
            )}
          </div>

          {/* Right Column: Story & Comments */}
          <div className="flex w-full flex-col md:w-2/5 h-full max-h-[90vh]">
            {/* Header: User Profile */}
            <div className="border-b border-stone-100 p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-stone-200">
                  {story.userId?.avatar ? (
                    <img src={story.userId.avatar} alt={story.userId.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-lg font-bold text-indigo-700">
                      {story.userId?.name?.charAt(0) || "T"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-stone-900">{story.userId?.name || "Unknown Traveller"}</div>
                  <Link 
                    href={`/destination/${story.destinationId?.slug || ""}`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    📍 {story.destinationId?.name || "Unknown Destination"}
                  </Link>
                </div>
              </div>
            </div>

            {/* Scrollable Story & Comments */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <h2 className="mb-2 text-xl font-black text-stone-900">{story.title}</h2>
              <div className="mb-4 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`h-4 w-4 ${star <= story.rating ? "text-amber-400" : "text-stone-200"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
                <span className="ml-2 text-xs text-stone-400">{fmtDate(story.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                {story.review}
              </p>

              <hr className="my-6 border-stone-100" />

              <h3 className="mb-4 text-sm font-bold text-stone-900">Comments ({story.comments?.length || 0})</h3>
              <div className="space-y-4">
                {story.comments?.map(comment => {
                  const cName = (comment.userId as any)?.name || comment.userName || "User";
                  const cAvatar = (comment.userId as any)?.avatar || comment.userAvatar;
                  return (
                  <div key={comment._id || comment.id} className="flex gap-3">
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-stone-200">
                      {cAvatar ? (
                        <img src={cAvatar} alt={cName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-xs font-bold text-emerald-700">
                          {cName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm">
                        <span className="font-bold text-stone-900">{cName}</span>
                        <span className="ml-2 text-xs text-stone-400">{fmtDate(comment.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-stone-600">{comment.text}</p>
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* Footer: Action Bar & Comment Input */}
            <div className="border-t border-stone-100 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={handleLike} className="group flex items-center gap-1.5 transition">
                    <svg className={`h-6 w-6 transition-transform group-hover:scale-110 ${hasLiked ? "fill-rose-500 text-rose-500" : "fill-none text-stone-900"}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    <span className="text-sm font-semibold text-stone-700">{story.likes?.length || 0}</span>
                  </button>
                  <button className="group flex items-center gap-1.5 transition">
                    <svg className="h-6 w-6 fill-none text-stone-900 transition-transform group-hover:scale-110" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    <span className="text-sm font-semibold text-stone-700">{story.comments?.length || 0}</span>
                  </button>
                  <button onClick={handleShare} className="group flex items-center gap-1.5 transition">
                    <svg className="h-6 w-6 fill-none text-stone-900 transition-transform group-hover:scale-110" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  </button>
                </div>
                <button onClick={handleSave} className="group transition">
                  <svg className={`h-6 w-6 transition-transform group-hover:scale-110 ${hasSaved ? "fill-stone-900 text-stone-900" : "fill-none text-stone-900"}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </button>
              </div>

              <form onSubmit={submitComment} className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="h-10 w-full flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-300 focus:bg-white focus:ring-4 focus:ring-stone-100"
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting || !commentText.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <svg className="h-4 w-4 -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
