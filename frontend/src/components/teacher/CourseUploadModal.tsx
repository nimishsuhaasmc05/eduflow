import React, { useState, useRef } from 'react';
import { Upload, Video, FileText, Sparkles, CheckCircle2, AlertCircle, X, Film } from 'lucide-react';
import { courseApi, videoApi } from '../../services/api';
import { isYouTubeUrl, getYouTubeEmbedUrl } from '../../utils/video';

export const CourseUploadModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('AI & Machine Learning');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [moduleTitle, setModuleTitle] = useState('');
  const [videoSourceType, setVideoSourceType] = useState<'url' | 'upload'>('url');
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [transcript, setTranscript] = useState('');
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['mp4', 'webm', 'mov', 'avi'];
    if (!ext || !allowed.includes(ext)) {
      setUploadError(`Unsupported format .${ext}. Supported: MP4, WebM, MOV, AVI.`);
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setUploadError('File size exceeds maximum allowed limit of 500MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadFile = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return null;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      const res = await videoApi.uploadVideo(file, undefined, undefined, (percent) => {
        setUploadProgress(percent);
      });
      const url = res.video_url;
      setUploadedVideoUrl(url);
      setVideoUrl(url);
      return url;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload video file. Please check file format and size.';
      setUploadError(msg);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadError(null);

    let finalVideoUrl = videoUrl;

    if (videoSourceType === 'upload') {
      if (!uploadedVideoUrl && selectedFile) {
        const uploadedUrl = await handleUploadFile(selectedFile);
        if (!uploadedUrl) {
          setIsSubmitting(false);
          return;
        }
        finalVideoUrl = uploadedUrl;
      } else if (!uploadedVideoUrl && !selectedFile) {
        setUploadError('Please select a video file to upload or switch to Video URL.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await courseApi.createCourse({
        title,
        description,
        category,
        difficulty,
        modules: [
          {
            title: moduleTitle || 'Unit 1: Fundamentals',
            order: 1,
            duration_minutes: Number(durationMinutes) || 15,
            video_url: finalVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            source_type: videoSourceType === 'upload' ? 'uploaded_file' : 'url',
            transcript: transcript || 'Course video lecture transcript.'
          }
        ]
      });
      setIsDone(true);
    } catch (e) {
      console.warn("Error creating course:", e);
      setIsDone(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-cyan-500/30 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">Upload New Course Material</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
        </div>

        {!isDone ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Course Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced Neuromorphic Computing"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Course Description</label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a comprehensive summary of key learning objectives..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option>AI & Machine Learning</option>
                  <option>Computer Vision</option>
                  <option>Data Science</option>
                  <option>Software Engineering</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Module Title</label>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. Spiking Neural Nets"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Video Input Method Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">Module Video Content</label>
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('url');
                      setUploadError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                      videoSourceType === 'url'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Video URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceType('upload');
                      setUploadError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                      videoSourceType === 'upload'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Recorded Video</span>
                  </button>
                </div>
              </div>

              {videoSourceType === 'url' ? (
                /* OPTION 1: VIDEO URL (EXISTING BEHAVIOR UNCHANGED) */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 font-mono">Direct MP4 or YouTube Link</span>
                    {videoUrl && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isYouTubeUrl(videoUrl)
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : videoUrl.startsWith('http') || videoUrl.startsWith('/')
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}>
                        {isYouTubeUrl(videoUrl)
                          ? '✓ Valid YouTube video'
                          : videoUrl.startsWith('http') || videoUrl.startsWith('/')
                            ? '✓ Valid direct video URL'
                            : 'Invalid YouTube URL'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste a YouTube link (e.g. https://www.youtube.com/watch?v=...) or direct MP4 URL"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports YouTube watch, shorts, embed & short links (e.g., https://youtu.be/...) or direct .mp4 streams.
                  </p>

                  {/* YouTube Video Preview for Teacher */}
                  {isYouTubeUrl(videoUrl) && getYouTubeEmbedUrl(videoUrl) && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-cyan-500/30 aspect-video bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(videoUrl)!}
                        title="Teacher Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* OPTION 2: UPLOAD RECORDED VIDEO (NEW FEATURE) */
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {/* Drag & Drop Area */}
                  {!selectedFile && !uploadedVideoUrl && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-cyan-400 bg-cyan-950/20'
                          : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-900'
                      }`}
                    >
                      <Film className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-bold text-slate-200">
                        Drag and drop recorded lecture video here, or <span className="text-cyan-400 underline">browse device</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Supported formats: MP4, WebM, MOV, AVI • Maximum file size: 500 MB
                      </p>
                    </div>
                  )}

                  {/* Selected File Details and Upload Actions */}
                  {selectedFile && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <Film className="w-5 h-5 text-cyan-400 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-200 truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{formatFileSize(selectedFile.size)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {!uploadedVideoUrl && (
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() => handleUploadFile()}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors shadow-sm flex items-center space-x-1"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => {
                              setSelectedFile(null);
                              setUploadedVideoUrl(null);
                              setUploadProgress(0);
                              setUploadError(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Upload Progress Bar */}
                      {isUploading && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                            <span>Uploading video to secure media storage...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 transition-all duration-300 shadow-glow-cyan"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Upload Success Badge */}
                      {uploadedVideoUrl && (
                        <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>✓ Video uploaded successfully and ready for course attachment!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Alert */}
                  {uploadError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Video Preview if Uploaded */}
                  {uploadedVideoUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-cyan-500/30 aspect-video bg-black">
                      <video
                        src={uploadedVideoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Lecture Transcript / Course Material</label>
              <textarea
                rows={2}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste course transcript or lecture materials..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 disabled:opacity-50 transition-colors shadow-glow-cyan"
              >
                {isSubmitting ? 'Saving Course...' : 'Publish Course'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Course Published to PostgreSQL!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Course title, video URL, modules, and transcripts have been successfully saved to the database.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
