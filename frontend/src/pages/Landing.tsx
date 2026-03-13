import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { authenticate, uploadResume } from '../lib/api';

export default function Landing() {
  const [isHovering, setIsHovering] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleProceed = async () => {
    if (!file) return;
    try {
      setUploading(true);
      // Mock user login for session tracking
      const user = await authenticate("demo_user", "demo@resumizer.com");
      // Store user id in local storage
      localStorage.setItem('resumizer_user_id', user.id.toString());
      
      const context = await uploadResume(user.id, file);
      localStorage.setItem('resumizer_base_id', context.id.toString());
      
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      alert("Error uploading resume. Check backend connection.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative flex items-center justify-center">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />

      <div className="z-10 w-full max-w-3xl px-6 flex flex-col items-center">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
            Resumizer
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Upload your base resume. Enter a job description. Let AI perfectly tailor your experience to beat the ATS.
          </p>
        </div>

        <div
          className={`w-full max-w-xl p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer min-h-[300px] glass-panel bg-card/60
            ${isHovering ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border active:scale-[0.98]'}
            ${file ? 'border-primary ring-4 ring-primary/20' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx"
          />

          {!file ? (
            <>
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <UploadCloud className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Drop your resume here</h3>
              <p className="text-muted-foreground text-center">
                Supports PDF, DOC, or DOCX up to 10MB
              </p>
              <button className="mt-8 px-6 py-3 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors">
                Browse Files
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center w-full animate-in fade-in duration-500">
              <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 relative">
                <FileText className="w-12 h-12 text-primary" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
              <h3 className="text-xl font-medium mb-1 line-clamp-1">{file.name}</h3>
              <p className="text-sm text-muted-foreground mb-8">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  disabled={uploading}
                  className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-secondary transition-colors font-medium text-muted-foreground disabled:opacity-50"
                >
                  Change File
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleProceed(); }}
                  disabled={uploading}
                  className="flex-[2] py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {uploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Uploading & Parsing...</>
                  ) : (
                    <>Parse & Continue <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
