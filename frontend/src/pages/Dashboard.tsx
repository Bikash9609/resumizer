import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Download, MoreVertical, Loader2 } from 'lucide-react';
import { fetchResumes, generateResume, downloadUrl } from '../lib/api';

interface ResumeContext {
  id: number;
  filename: string;
  created_at: string;
}

interface GeneratedResume {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [baseContexts, setBaseContexts] = useState<ResumeContext[]>([]);
  const [generatedResumes, setGeneratedResumes] = useState<GeneratedResume[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jdText, setJdText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(true);

  // Derived active base ID
  const activeBaseId = parseInt(localStorage.getItem('resumizer_base_id') || '0');
  const userId = parseInt(localStorage.getItem('resumizer_user_id') || '0');

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }
    loadData();
    // Setup simple polling every 5s if there is any generating resume
    const interval = setInterval(() => {
        loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, navigate]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchResumes(userId);
      setBaseContexts(data.resumes);
      setGeneratedResumes(data.generated);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!jdText.trim() || !activeBaseId) return;
    setIsModalOpen(false);
    
    // Optimistic UI update
    const tempId = Math.floor(Math.random() * 100000);
    const newGen = {
      id: tempId,
      title: 'AI Tailored Resume',
      status: 'generating',
      created_at: new Date().toISOString()
    };
    setGeneratedResumes(prev => [newGen, ...prev]);

    try {
      await generateResume(activeBaseId, jdText, customInstructions, 'AI Tailored Resume');
      setJdText('');
      setCustomInstructions('');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to start generation');
    }
  };

  const handleDownload = (id: number, format: 'pdf' | 'docx' | 'md' = 'pdf') => {
    window.location.href = downloadUrl(id, format);
  };

  const allItems = [
    ...baseContexts.map(c => ({
      id: `base_${c.id}`,
      title: c.filename,
      isBase: true,
      status: 'completed',
      date: new Date(c.created_at).toLocaleDateString(),
      rawId: c.id
    })),
    ...generatedResumes.map(g => ({
      id: `gen_${g.id}`,
      title: g.title,
      isBase: false,
      status: g.status,
      date: new Date(g.created_at).toLocaleDateString(),
      rawId: g.id
    }))
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
               <FileText className="w-5 h-5 text-primary" />
             </div>
             Resumizer
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" /> Target New Role
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Resumes</h1>
          <p className="text-muted-foreground">Manage your base context and generated tailored resumes.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {loading && allItems.length === 0 ? (
             <div className="p-16 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
             </div>
          ) : allItems.length === 0 ? (
             <div className="p-16 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                 <FileText className="w-8 h-8 text-muted-foreground" />
               </div>
               <h3 className="text-xl font-medium mb-2">No resumes yet</h3>
               <p className="text-muted-foreground max-w-sm mb-6">Upload your base resume to start generating tailored versions.</p>
             </div>
          ) : (
            <div className="divide-y divide-border">
              {allItems.map(resume => (
                <div key={resume.id} className="p-4 sm:p-6 flex items-center gap-4 hover:bg-secondary/30 transition-colors group">
                  
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${resume.isBase ? 'bg-accent/10 border border-accent/20' : 'bg-primary/10 border border-primary/20'}`}>
                    {resume.status === 'generating' ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <FileText className={`w-6 h-6 ${resume.isBase ? 'text-accent' : 'text-primary'}`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base text-foreground flex items-center gap-2">
                      <span className="truncate">{resume.title}</span>
                      {resume.isBase && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent">Base Context</span>
                      )}
                      {resume.status === 'generating' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 animate-pulse">Generating UI/UX Context...</span>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{resume.date}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {resume.status === 'completed' && !resume.isBase && (
                       <>
                         <button 
                            onClick={() => handleDownload(resume.rawId, 'pdf')}
                            className="text-xs px-3 py-1.5 font-medium text-muted-foreground border border-border hover:text-foreground rounded-lg hover:bg-secondary transition-colors" title="Download PDF">
                           PDF
                         </button>
                         <button 
                            onClick={() => handleDownload(resume.rawId, 'docx')}
                            className="text-xs px-3 py-1.5 font-medium text-muted-foreground border border-border hover:text-foreground rounded-lg hover:bg-secondary transition-colors" title="Download DOCX">
                           DOCX
                         </button>
                       </>
                    )}
                    <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* JD Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold">Target a New Role</h2>
              <p className="text-muted-foreground mt-1">Paste the job description to tailor your resume.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Description <span className="text-destructive">*</span></label>
                <textarea 
                  className="w-full h-40 rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Paste the raw text of the job description here..."
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Context <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input 
                  type="text"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g. Focus heavily on my React experience over Angular"
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-full font-medium hover:bg-secondary text-secondary-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerate}
                disabled={!jdText.trim()}
                className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Generate Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
