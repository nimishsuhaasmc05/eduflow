import React, { useState, useEffect, useRef } from 'react';
import { Course, Module } from '../../types';
import { courseApi, videoApi } from '../../services/api';
import { EDUCATION_IMAGE_PRESETS, getEducationImageUrl } from '../../utils/images';
import { isYouTubeUrl, getYouTubeEmbedUrl } from '../../utils/video';
import { 
  X, Plus, Trash2, ArrowUp, ArrowDown, Video, Save, BookOpen, Layers, 
  CheckCircle2, FileText, Image as ImageIcon, RotateCcw, AlertCircle, Play,
  Upload, Film
} from 'lucide-react';

interface CourseEditorModalProps {
  course?: Course | null;
  onClose: () => void;
  onSaved: () => void;
}

export const CourseEditorModal: React.FC<CourseEditorModalProps> = ({ course, onClose, onSaved }) => {
  const isEditing = !!course && !!course.id;

  const resolveVideoPreviewUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('/')) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const backendOrigin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
      return `${backendOrigin}${url}`;
    }
    return url;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Course state
  const [activeTab, setActiveTab] = useState<'info' | 'modules'>('info');
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [category, setCategory] = useState(course?.category || 'Computer Science');
  const [difficulty, setDifficulty] = useState(course?.difficulty || 'Intermediate');
  const [status, setStatus] = useState(course?.status || 'published');
  const [durationHours, setDurationHours] = useState<number>(course?.duration_hours || 5.0);
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnail_url || EDUCATION_IMAGE_PRESETS[0].url);
  const [learningObjectives, setLearningObjectives] = useState(
    course?.learning_objectives || 
    "✓ Understand real-time MediaPipe computer vision landmark tracking\n✓ Master closed-loop affective feedback loops\n✓ Implement adaptive learning state controllers"
  );

  // Original saved modules array (source of truth from DB)
  const [modules, setModules] = useState<Module[]>(course?.modules || []);
  
  // Buffered local editable modules state (prevents keystroke HTTP PUT calls)
  const [editingModules, setEditingModules] = useState<Module[]>([]);

  // Per-module UI feedback state
  const [savingModuleId, setSavingModuleId] = useState<number | null>(null);
  const [moduleFeedback, setModuleFeedback] = useState<{ [key: number]: { type: 'success' | 'error'; msg: string } }>({});
  const [moduleUploadingState, setModuleUploadingState] = useState<{ [key: number]: { isUploading: boolean; progress: number; error: string | null } }>({});

  // New module inputs state
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleDuration, setNewModuleDuration] = useState<number>(20);
  const [newModuleSourceType, setNewModuleSourceType] = useState<'url' | 'upload'>('url');
  const [newModuleVideoUrl, setNewModuleVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [newModuleFile, setNewModuleFile] = useState<File | null>(null);
  const [newModuleUploading, setNewModuleUploading] = useState(false);
  const [newModuleUploadProgress, setNewModuleUploadProgress] = useState(0);
  const [newModuleUploadError, setNewModuleUploadError] = useState<string | null>(null);
  const [newModuleUploadedUrl, setNewModuleUploadedUrl] = useState<string | null>(null);
  const [newModuleDragging, setNewModuleDragging] = useState(false);
  const newModuleFileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description);
      setCategory(course.category || 'Computer Science');
      setDifficulty(course.difficulty || 'Intermediate');
      setStatus(course.status || 'published');
      setDurationHours(course.duration_hours || 5.0);
      setThumbnailUrl(course.thumbnail_url || getEducationImageUrl(null, course.category));
      setLearningObjectives(course.learning_objectives || "✓ Core fundamentals & practical hands-on projects");
      
      const loadedMods = course.modules || [];
      setModules(loadedMods);
      setEditingModules(JSON.parse(JSON.stringify(loadedMods)));
    }
  }, [course]);

  // Main Course Info Save Handler
  const handleSaveCourseInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload: Partial<Course> = {
        title,
        description,
        category,
        difficulty,
        status,
        duration_hours: Number(durationHours),
        thumbnail_url: thumbnailUrl,
        learning_objectives: learningObjectives
      };

      if (isEditing && course?.id) {
        await courseApi.updateCourse(course.id, payload);
        setSuccessMsg("✓ Course saved successfully");
      } else {
        await courseApi.createCourse({
          ...payload,
          modules: editingModules.length > 0 ? editingModules : [
            {
              title: "Unit 1: Foundations & Architecture",
              description: "Introduction to core concepts and practical setup.",
              order: 1,
              duration_minutes: 20,
              video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              transcript: "In this module, we explore the core architecture."
            }
          ]
        });
        setSuccessMsg("✓ Course created successfully");
      }
      onSaved();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Failed to save course. Please check all fields.");
    } finally {
      setSaving(false);
    }
  };

  // Local state edit handlers for buffered modules (NO API CALL ON KEYSTROKE)
  const handleFieldChange = (index: number, field: keyof Module, value: any) => {
    const updated = [...editingModules];
    updated[index] = { ...updated[index], [field]: value };
    setEditingModules(updated);
    
    // Clear status feedback when user makes new edits
    if (moduleFeedback[index]) {
      const copy = { ...moduleFeedback };
      delete copy[index];
      setModuleFeedback(copy);
    }
  };

  // Save specific existing module to backend on button click
  const handleSaveExistingModule = async (index: number) => {
    const targetMod = editingModules[index];
    if (!targetMod) return;

    if (!targetMod.title || !targetMod.title.trim()) {
      setModuleFeedback({
        ...moduleFeedback,
        [index]: { type: 'error', msg: 'Module title is required.' }
      });
      return;
    }

    setSavingModuleId(targetMod.id || index);
    try {
      if (isEditing && course?.id && targetMod.id) {
        const updatedFromApi = await courseApi.updateModule(course.id, targetMod.id, {
          title: targetMod.title.trim(),
          description: targetMod.description || '',
          duration_minutes: Number(targetMod.duration_minutes) || 15,
          video_url: targetMod.video_url || '',
          order: targetMod.order || index + 1,
          transcript: targetMod.transcript || ''
        });

        // Sync both original modules and editingModules
        const updatedOriginals = [...modules];
        updatedOriginals[index] = updatedFromApi;
        setModules(updatedOriginals);

        const updatedEditing = [...editingModules];
        updatedEditing[index] = updatedFromApi;
        setEditingModules(updatedEditing);

        setModuleFeedback({
          ...moduleFeedback,
          [index]: { type: 'success', msg: '✓ Module updated successfully' }
        });
        onSaved();
      } else {
        // Local state update when creating a new course draft
        const updatedOriginals = [...editingModules];
        setModules(updatedOriginals);
        setModuleFeedback({
          ...moduleFeedback,
          [index]: { type: 'success', msg: '✓ Local module updated' }
        });
      }
    } catch (err: any) {
      console.error("Save module error:", err);
      const errMsg = err.response?.data?.detail || "Failed to update module on backend.";
      setModuleFeedback({
        ...moduleFeedback,
        [index]: { type: 'error', msg: errMsg }
      });
    } finally {
      setSavingModuleId(null);
    }
  };

  // Cancel module edits and revert to original saved values
  const handleCancelModuleEdit = (index: number) => {
    const originalMod = modules[index];
    if (originalMod) {
      const updated = [...editingModules];
      updated[index] = JSON.parse(JSON.stringify(originalMod));
      setEditingModules(updated);
    }
    const copy = { ...moduleFeedback };
    delete copy[index];
    setModuleFeedback(copy);
  };

  // Upload handler for existing module
  const handleUploadForExistingModule = async (index: number, file: File) => {
    const targetMod = editingModules[index];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['mp4', 'webm', 'mov', 'avi'];
    if (!ext || !allowed.includes(ext)) {
      setModuleUploadingState(prev => ({
        ...prev,
        [index]: { isUploading: false, progress: 0, error: `Unsupported format .${ext}. Allowed: MP4, WebM, MOV, AVI.` }
      }));
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setModuleUploadingState(prev => ({
        ...prev,
        [index]: { isUploading: false, progress: 0, error: 'File size exceeds maximum allowed 500MB.' }
      }));
      return;
    }

    setModuleUploadingState(prev => ({
      ...prev,
      [index]: { isUploading: true, progress: 0, error: null }
    }));

    try {
      const res = await videoApi.uploadVideo(file, course?.id, targetMod?.id, (percent) => {
        setModuleUploadingState(prev => ({
          ...prev,
          [index]: { isUploading: true, progress: percent, error: null }
        }));
      });
      handleFieldChange(index, 'video_url', res.video_url);
      handleFieldChange(index, 'source_type', 'uploaded_file');
      setModuleUploadingState(prev => ({
        ...prev,
        [index]: { isUploading: false, progress: 100, error: null }
      }));
      setModuleFeedback(prev => ({
        ...prev,
        [index]: { type: 'success', msg: '✓ Video file uploaded and attached to module.' }
      }));
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload video.';
      setModuleUploadingState(prev => ({
        ...prev,
        [index]: { isUploading: false, progress: 0, error: msg }
      }));
    }
  };

  // Upload handler for new module
  const handleUploadNewModuleFile = async (fileToUpload?: File) => {
    const file = fileToUpload || newModuleFile;
    if (!file) return null;
    setNewModuleUploading(true);
    setNewModuleUploadError(null);
    setNewModuleUploadProgress(0);
    try {
      const res = await videoApi.uploadVideo(file, course?.id, undefined, (percent) => {
        setNewModuleUploadProgress(percent);
      });
      const url = res.video_url;
      setNewModuleUploadedUrl(url);
      setNewModuleVideoUrl(url);
      return url;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload video file.';
      setNewModuleUploadError(msg);
      return null;
    } finally {
      setNewModuleUploading(false);
    }
  };

  // Add a new module
  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    setErrorMsg(null);
    setNewModuleUploadError(null);

    let finalVideoUrl = newModuleVideoUrl.trim();
    let finalSourceType = newModuleSourceType === 'upload' ? 'uploaded_file' : 'url';

    if (newModuleSourceType === 'upload') {
      if (!newModuleUploadedUrl && newModuleFile) {
        const uploadedUrl = await handleUploadNewModuleFile(newModuleFile);
        if (!uploadedUrl) return;
        finalVideoUrl = uploadedUrl;
      } else if (!newModuleUploadedUrl && !newModuleFile) {
        setNewModuleUploadError('Please select a video file or switch to Video URL.');
        return;
      } else if (newModuleUploadedUrl) {
        finalVideoUrl = newModuleUploadedUrl;
      }
    }

    const newMod: Partial<Module> = {
      title: newModuleTitle.trim(),
      description: newModuleDesc.trim() || 'Module lesson overview.',
      duration_minutes: Number(newModuleDuration) || 15,
      video_url: finalVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      source_type: finalSourceType,
      order: editingModules.length + 1,
      transcript: 'Automated generated transcript for module lesson.'
    };

    if (isEditing && course?.id) {
      try {
        const created = await courseApi.addModule(course.id, newMod);
        const nextModules = [...modules, created];
        setModules(nextModules);
        setEditingModules(JSON.parse(JSON.stringify(nextModules)));
        onSaved();
      } catch (err: any) {
        setErrorMsg("Failed to add module to database.");
        return;
      }
    } else {
      const nextModules = [...editingModules, newMod as Module];
      setModules(nextModules);
      setEditingModules(nextModules);
    }

    setNewModuleTitle('');
    setNewModuleDesc('');
    setNewModuleDuration(20);
    setNewModuleVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    setNewModuleFile(null);
    setNewModuleUploadedUrl(null);
    setNewModuleUploadProgress(0);
    setNewModuleUploadError(null);
    if (newModuleFileInputRef.current) newModuleFileInputRef.current.value = '';
  };

  // Delete a module
  const handleDeleteModule = async (index: number) => {
    const modToDelete = editingModules[index];
    if (isEditing && course?.id && modToDelete.id) {
      try {
        await courseApi.deleteModule(course.id, modToDelete.id);
      } catch (err) {
        setErrorMsg("Failed to delete module.");
        return;
      }
    }
    const updated = editingModules.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i + 1 }));
    setEditingModules(updated);
    setModules(updated);

    if (isEditing && course?.id) {
      courseApi.reorderModules(course.id, updated.map(m => ({ id: m.id!, order: m.order }))).catch(() => {});
      onSaved();
    }
  };

  // Reorder modules up / down
  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === editingModules.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...editingModules];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((m, i) => ({ ...m, order: i + 1 }));
    setEditingModules(reordered);
    setModules(reordered);

    if (isEditing && course?.id) {
      courseApi.reorderModules(course.id, reordered.map(m => ({ id: m.id!, order: m.order }))).catch(() => {});
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07111F]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-[#0B1728] border border-[#24425C] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#F5F9FC]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#24425C] flex items-center justify-between bg-[#10243A]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#27D7E8]" />
              <span>{isEditing ? `Edit Course: ${course?.title}` : 'Create New Course'}</span>
            </h2>
            <p className="text-xs text-[#9FB2C5] mt-1">Configure curriculum details, YouTube video links, and module metadata.</p>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-[#9FB2C5] hover:text-white hover:bg-[#142B43] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#24425C] bg-[#0B1728] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'info' ? 'border-[#27D7E8] text-[#58E6F2]' : 'border-transparent text-[#9FB2C5] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Course Information</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'modules' ? 'border-[#27D7E8] text-[#58E6F2]' : 'border-transparent text-[#9FB2C5] hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Course Modules ({editingModules.length})</span>
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'info' ? (
            /* FORM ONLY FOR TAB 1 COURSE INFO */
            <form id="course-form" onSubmit={handleSaveCourseInfo} className="space-y-5">
              
              {/* Course Title */}
              <div>
                <label className="block text-xs font-bold text-[#9FB2C5] mb-1.5 uppercase tracking-wider">Course Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Advanced Computer Vision & Deep Learning"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#10243A] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#9FB2C5] mb-1.5 uppercase tracking-wider">Course Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a comprehensive summary of what students will learn..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#10243A] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none transition-colors"
                />
              </div>

              {/* Category, Difficulty, Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9FB2C5] mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#10243A] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Programming">Programming</option>
                    <option value="Robotics">Robotics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9FB2C5] mb-1.5 uppercase tracking-wider">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#10243A] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9FB2C5] mb-1.5 uppercase tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#10243A] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Course Thumbnail Selector */}
              <div>
                <label className="block text-xs font-bold text-[#9FB2C5] mb-1.5 uppercase tracking-wider flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-[#27D7E8]" />
                  <span>Course Thumbnail (Education Photography)</span>
                </label>
                
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Paste custom image URL..."
                  className="w-full px-4 py-2 rounded-xl bg-[#10243A] border border-[#24425C] text-xs text-white mb-3 focus:border-[#27D7E8] focus:outline-none"
                />

                {/* Presets Gallery */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {EDUCATION_IMAGE_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setThumbnailUrl(preset.url)}
                      className={`cursor-pointer rounded-xl overflow-hidden border transition-all ${
                        thumbnailUrl === preset.url ? 'border-[#27D7E8] ring-2 ring-[#27D7E8]/50 scale-105' : 'border-[#24425C] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.title} className="w-full h-16 object-cover" />
                      <div className="p-1.5 bg-[#10243A] text-[10px] font-bold text-[#9FB2C5] truncate">{preset.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Objectives */}
              <div>
                <label className="block text-xs font-bold text-[#9FB2C5] mb-1.5 uppercase tracking-wider">Learning Objectives</label>
                <textarea
                  rows={3}
                  value={learningObjectives}
                  onChange={(e) => setLearningObjectives(e.target.value)}
                  placeholder="Enter key course takeaways (one per line)..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#10243A] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                />
              </div>
            </form>
          ) : (
            /* TAB 2: COURSE MODULES EDITING */
            <div className="space-y-6">
              {/* Existing Modules List */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#27D7E8]">Current Course Modules ({editingModules.length})</h3>
                
                {editingModules.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-[#10243A] border border-dashed border-[#24425C] text-[#9FB2C5] text-xs">
                    No modules created yet. Add a new module below.
                  </div>
                ) : (
                  editingModules.map((mod, idx) => {
                    const isYouTube = isYouTubeUrl(mod.video_url);
                    const embedUrl = isYouTube ? getYouTubeEmbedUrl(mod.video_url) : null;
                    const feedback = moduleFeedback[idx];
                    const isSavingThis = savingModuleId === (mod.id || idx);

                    return (
                      <div key={mod.id || idx} className="bg-[#10243A] p-5 rounded-2xl border border-[#24425C] shadow-sm space-y-4">
                        
                        {/* Module Header Row */}
                        <div className="flex items-center justify-between border-b border-[#24425C] pb-3">
                          <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-full bg-[#0B1728] text-[#27D7E8] text-xs font-bold flex items-center justify-center font-mono border border-[#24425C]">
                              #{mod.order || idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              MODULE #{mod.order || idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleMoveModule(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg bg-[#0B1728] text-[#9FB2C5] hover:text-white disabled:opacity-30 border border-[#24425C]"
                              title="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveModule(idx, 'down')}
                              disabled={idx === editingModules.length - 1}
                              className="p-1.5 rounded-lg bg-[#0B1728] text-[#9FB2C5] hover:text-white disabled:opacity-30 border border-[#24425C]"
                              title="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteModule(idx)}
                              className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800 hover:bg-rose-900/80 transition-colors"
                              title="Delete Module"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Module Edit Fields Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          
                          {/* Module Title */}
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-[#9FB2C5] mb-1 uppercase tracking-wider">Module Title</label>
                            <input
                              type="text"
                              value={mod.title || ''}
                              onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                              placeholder="e.g. Unit 1: Neural Networks Foundations"
                              className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                            />
                          </div>

                          {/* Module Duration */}
                          <div>
                            <label className="block text-[11px] font-bold text-[#9FB2C5] mb-1 uppercase tracking-wider">Duration (Minutes)</label>
                            <input
                              type="number"
                              min={1}
                              value={mod.duration_minutes || 15}
                              onChange={(e) => handleFieldChange(idx, 'duration_minutes', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        {/* Module Description */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#9FB2C5] mb-1 uppercase tracking-wider">Module Description</label>
                          <textarea
                            rows={2}
                            value={mod.description || ''}
                            onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                            placeholder="Detailed lesson overview..."
                            className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                          />
                        </div>

                        {/* Video URL Input with YouTube Badge & Upload Option */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-[#9FB2C5] uppercase tracking-wider flex items-center space-x-1.5">
                              <Video className="w-3.5 h-3.5 text-[#27D7E8]" />
                              <span>Module Video Content</span>
                            </label>
                            
                            {mod.video_url && (
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                isYouTube
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : mod.source_type === 'uploaded_file' || mod.video_url.startsWith('/media/')
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                    : mod.video_url.startsWith('http')
                                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              }`}>
                                {isYouTube 
                                  ? '✓ Valid YouTube video' 
                                  : mod.source_type === 'uploaded_file' || mod.video_url.startsWith('/media/')
                                    ? '✓ Uploaded Video File'
                                    : mod.video_url.startsWith('http') 
                                      ? '✓ Direct Video URL' 
                                      : 'Invalid Video URL'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={mod.video_url || ''}
                              onChange={(e) => handleFieldChange(idx, 'video_url', e.target.value)}
                              placeholder="Paste a YouTube link (e.g. https://www.youtube.com/watch?v=...) or direct MP4 URL"
                              className="flex-1 px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white font-mono focus:border-[#27D7E8] focus:outline-none"
                            />

                            {/* Upload replacement video file button */}
                            <label className="px-2.5 py-2 rounded-xl bg-[#142B43] text-[#58E6F2] text-[10px] font-bold border border-[#24425C] hover:bg-[#10243A] cursor-pointer flex items-center space-x-1 shrink-0">
                              <Upload className="w-3 h-3" />
                              <span>{moduleUploadingState[idx]?.isUploading ? 'Uploading...' : 'Upload File'}</span>
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
                                className="hidden"
                                disabled={moduleUploadingState[idx]?.isUploading}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadForExistingModule(idx, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleFieldChange(idx, 'video_url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                              className="px-2.5 py-2 rounded-xl bg-[#142B43] text-[#58E6F2] text-[10px] font-bold border border-[#24425C] hover:bg-[#10243A] whitespace-nowrap"
                            >
                              Sample YouTube
                            </button>
                          </div>

                          {/* Upload Progress for Existing Module */}
                          {moduleUploadingState[idx]?.isUploading && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono text-[#27D7E8]">
                                <span>Uploading replacement video...</span>
                                <span>{moduleUploadingState[idx].progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#0B1728] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#27D7E8] transition-all duration-300"
                                  style={{ width: `${moduleUploadingState[idx].progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {moduleUploadingState[idx]?.error && (
                            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{moduleUploadingState[idx].error}</span>
                            </div>
                          )}

                          <p className="text-[10px] text-[#9FB2C5]">
                            Supports YouTube URLs, uploaded MP4/WebM/MOV/AVI recordings, or direct video streams.
                          </p>

                          {/* Teacher Video Preview iframe if YouTube */}
                          {isYouTube && embedUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-[#24425C] aspect-video bg-black max-h-48">
                              <iframe
                                src={embedUrl}
                                title={`Module ${idx + 1} Preview`}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}

                          {/* Native HTML5 Video Preview if Direct/Uploaded */}
                          {!isYouTube && mod.video_url && (mod.video_url.startsWith('http') || mod.video_url.startsWith('/')) && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-[#24425C] aspect-video bg-black max-h-48">
                              <video
                                src={resolveVideoPreviewUrl(mod.video_url)}
                                controls
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          {/* Optional Transcript Input & Auto-Fetch Status */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-[#9FB2C5] uppercase tracking-wider">
                                Lesson Transcript (Optional)
                              </label>
                              <span className="text-[10px] font-mono font-bold text-cyan-400">
                                {mod.transcript ? "✓ Custom transcript attached" : isYouTube ? "✓ Auto-fetched from YouTube on save" : "No transcript attached"}
                              </span>
                            </div>
                            <textarea
                              rows={2}
                              value={mod.transcript || ''}
                              onChange={(e) => handleFieldChange(idx, 'transcript', e.target.value)}
                              placeholder="Leave blank to auto-fetch public YouTube captions on save, or paste custom transcript text..."
                              className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Per-Module Action Buttons Row */}
                        <div className="pt-2 border-t border-[#24425C] flex items-center justify-between">
                          <div>
                            {feedback && (
                              <span className={`text-xs font-bold ${feedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {feedback.msg}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleCancelModuleEdit(idx)}
                              className="px-3 py-1.5 rounded-xl border border-[#24425C] text-[#9FB2C5] hover:text-white text-xs font-bold transition-colors flex items-center space-x-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleSaveExistingModule(idx)}
                              className="px-4 py-1.5 rounded-xl bg-[#27D7E8] text-[#07111F] font-extrabold text-xs hover:bg-[#58E6F2] disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5 text-[#07111F]" />
                              <span>{isSavingThis ? 'Saving Module...' : 'Save Module'}</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Module Section */}
              <div className="bg-[#10243A] p-5 rounded-2xl border border-[#24425C] space-y-4">
                <h4 className="text-xs font-bold text-[#27D7E8] uppercase tracking-wider flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add New Module</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Module Title (e.g. Unit 3: Deep Learning Architecture)"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Duration (mins)"
                      value={newModuleDuration}
                      onChange={(e) => setNewModuleDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Module Description"
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white focus:border-[#27D7E8] focus:outline-none"
                />

                {/* Add New Module Video Source Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#9FB2C5] uppercase tracking-wider">
                      Module Video Content
                    </label>
                    <div className="flex items-center space-x-1 bg-[#0B1728] p-1 rounded-xl border border-[#24425C]">
                      <button
                        type="button"
                        onClick={() => {
                          setNewModuleSourceType('url');
                          setNewModuleUploadError(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                          newModuleSourceType === 'url'
                            ? 'bg-[#27D7E8] text-[#07111F] shadow-sm'
                            : 'text-[#9FB2C5] hover:text-white'
                        }`}
                      >
                        <Video className="w-3 h-3" />
                        <span>Video URL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewModuleSourceType('upload');
                          setNewModuleUploadError(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                          newModuleSourceType === 'upload'
                            ? 'bg-[#27D7E8] text-[#07111F] shadow-sm'
                            : 'text-[#9FB2C5] hover:text-white'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Recorded Video</span>
                      </button>
                    </div>
                  </div>

                  {newModuleSourceType === 'url' ? (
                    /* URL INPUT (EXISTING BEHAVIOR PRESERVED) */
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[#9FB2C5] font-mono">Direct Video URL or YouTube Link</span>
                        {newModuleVideoUrl && (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isYouTubeUrl(newModuleVideoUrl)
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : newModuleVideoUrl.startsWith('http') || newModuleVideoUrl.startsWith('/')
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}>
                            {isYouTubeUrl(newModuleVideoUrl) ? '✓ Valid YouTube video' : newModuleVideoUrl.startsWith('http') || newModuleVideoUrl.startsWith('/') ? '✓ Direct Video URL' : 'Invalid YouTube URL'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...) or direct MP4 URL"
                        value={newModuleVideoUrl}
                        onChange={(e) => setNewModuleVideoUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0B1728] border border-[#24425C] text-xs text-white font-mono focus:border-[#27D7E8] focus:outline-none"
                      />

                      {/* YouTube Preview for New Module */}
                      {isYouTubeUrl(newModuleVideoUrl) && getYouTubeEmbedUrl(newModuleVideoUrl) && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-[#24425C] aspect-video bg-black max-h-48">
                          <iframe
                            src={getYouTubeEmbedUrl(newModuleVideoUrl)!}
                            title="New Module YouTube Preview"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* UPLOAD RECORDED VIDEO (NEW CAPABILITY) */
                    <div className="space-y-3">
                      <input
                        type="file"
                        ref={newModuleFileInputRef}
                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setNewModuleUploadError(null);
                            const ext = file.name.split('.').pop()?.toLowerCase();
                            const allowed = ['mp4', 'webm', 'mov', 'avi'];
                            if (!ext || !allowed.includes(ext)) {
                              setNewModuleUploadError(`Unsupported format .${ext}. Allowed: MP4, WebM, MOV, AVI.`);
                              return;
                            }
                            if (file.size > 500 * 1024 * 1024) {
                              setNewModuleUploadError('File size exceeds maximum allowed 500MB limit.');
                              return;
                            }
                            setNewModuleFile(file);
                          }
                        }}
                      />

                      {/* Drag & Drop Area */}
                      {!newModuleFile && !newModuleUploadedUrl && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setNewModuleDragging(true);
                          }}
                          onDragLeave={() => setNewModuleDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setNewModuleDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const file = e.dataTransfer.files[0];
                              setNewModuleUploadError(null);
                              const ext = file.name.split('.').pop()?.toLowerCase();
                              const allowed = ['mp4', 'webm', 'mov', 'avi'];
                              if (!ext || !allowed.includes(ext)) {
                                setNewModuleUploadError(`Unsupported format .${ext}. Allowed: MP4, WebM, MOV, AVI.`);
                                return;
                              }
                              if (file.size > 500 * 1024 * 1024) {
                                setNewModuleUploadError('File size exceeds maximum allowed 500MB limit.');
                                return;
                              }
                              setNewModuleFile(file);
                            }
                          }}
                          onClick={() => newModuleFileInputRef.current?.click()}
                          className={`p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                            newModuleDragging
                              ? 'border-[#27D7E8] bg-[#27D7E8]/10'
                              : 'border-[#24425C] bg-[#0B1728] hover:border-[#27D7E8]/50 hover:bg-[#10243A]'
                          }`}
                        >
                          <Film className="w-8 h-8 text-[#27D7E8] mx-auto mb-2 opacity-80" />
                          <p className="text-xs font-bold text-white">
                            Drag & drop recorded video here, or <span className="text-[#27D7E8] underline">browse device</span>
                          </p>
                          <p className="text-[10px] text-[#9FB2C5] mt-1">
                            Supported: MP4, WebM, MOV, AVI • Maximum file size: 500 MB
                          </p>
                        </div>
                      )}

                      {/* Selected File Details & Upload Action */}
                      {newModuleFile && (
                        <div className="p-3.5 rounded-xl bg-[#0B1728] border border-[#24425C] space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              <Film className="w-5 h-5 text-[#27D7E8] shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-bold text-white truncate">{newModuleFile.name}</p>
                                <p className="text-[10px] text-[#9FB2C5] font-mono">{formatFileSize(newModuleFile.size)}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {!newModuleUploadedUrl && (
                                <button
                                  type="button"
                                  disabled={newModuleUploading}
                                  onClick={() => handleUploadNewModuleFile()}
                                  className="px-3 py-1.5 rounded-lg bg-[#27D7E8] text-[#07111F] text-xs font-bold hover:bg-[#58E6F2] disabled:opacity-50 transition-colors shadow-sm flex items-center space-x-1"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{newModuleUploading ? 'Uploading...' : 'Upload File'}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={newModuleUploading}
                                onClick={() => {
                                  setNewModuleFile(null);
                                  setNewModuleUploadedUrl(null);
                                  setNewModuleUploadProgress(0);
                                  setNewModuleUploadError(null);
                                  if (newModuleFileInputRef.current) newModuleFileInputRef.current.value = '';
                                }}
                                className="p-1.5 rounded-lg text-[#9FB2C5] hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                                title="Remove selected file"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {newModuleUploading && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono text-[#27D7E8]">
                                <span>Uploading video to storage...</span>
                                <span>{newModuleUploadProgress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#10243A] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#27D7E8] transition-all duration-300 shadow-sm"
                                  style={{ width: `${newModuleUploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Success Badge */}
                          {newModuleUploadedUrl && (
                            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>✓ Video uploaded successfully and ready to be attached.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error Alert */}
                      {newModuleUploadError && (
                        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{newModuleUploadError}</span>
                        </div>
                      )}

                      {/* Video Preview */}
                      {newModuleUploadedUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-[#24425C] aspect-video bg-black max-h-48">
                          <video
                            src={resolveVideoPreviewUrl(newModuleUploadedUrl)}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="px-4 py-2 rounded-xl bg-[#27D7E8] text-[#07111F] font-extrabold text-xs hover:bg-[#58E6F2] transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-[#07111F]" />
                    <span>Add Module to Course</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-[#24425C] bg-[#10243A] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#24425C] text-[#9FB2C5] hover:text-white text-xs font-bold hover:bg-[#142B43] transition-colors"
          >
            Cancel
          </button>

          {/* SINGLE SUBMISSION BUTTON (Fixes Duplicate Submit Bug) */}
          <button
            type="submit"
            form="course-form"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#27D7E8] hover:bg-[#58E6F2] text-[#07111F] font-extrabold text-xs transition-all flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[#07111F]" />
            <span>{saving ? 'Saving to Database...' : 'Save Changes'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
