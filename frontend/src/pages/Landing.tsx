import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stack, Title, Text, Paper, Button,
  ThemeIcon, Group, rem,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCloudUpload, IconFileText, IconChevronRight,
  IconCheck, IconX,
} from '@tabler/icons-react';
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleProceed = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const user = await authenticate('demo_user', 'demo@resumizer.com');
      localStorage.setItem('resumizer_user_id', user.id.toString());
      const context = await uploadResume(user.id, file);
      localStorage.setItem('resumizer_base_id', context.id.toString());
      navigate('/dashboard');
    } catch {
      notifications.show({
        title: 'Upload failed',
        message: 'Check backend connection and try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Ambient glow blobs */}
      <Box
        style={{
          position: 'absolute', top: '-10%', left: '-10%',
          width: '40%', height: '40%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(132,94,247,0.25) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />
      <Box
        style={{
          position: 'absolute', bottom: '-10%', right: '-10%',
          width: '40%', height: '40%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(121,80,242,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      <Stack align="center" gap="xl" style={{ width: '100%', maxWidth: 640, padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center' }}
        >
          <Title
            order={1}
            style={{
              fontSize: 'clamp(3rem, 8vw, 5.5rem)',
              fontWeight: 900,
              letterSpacing: '-2px',
              lineHeight: 1.05,
              background: 'linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.45) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Resumizer
          </Title>
          <Text c="dimmed" size="lg" mt="sm" maw={460} mx="auto">
            Upload your base resume. Enter a job description. Let AI perfectly tailor your experience to beat the ATS.
          </Text>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ width: '100%' }}
        >
          <Paper
            radius="xl"
            p="xl"
            withBorder
            onDragOver={handleDragOver}
            onDragLeave={() => setIsHovering(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            style={{
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: file ? 'default' : 'pointer',
              transition: 'all 0.25s ease',
              border: isHovering
                ? '2px solid var(--mantine-color-violet-5)'
                : file
                ? '2px solid var(--mantine-color-violet-5)'
                : '2px solid var(--mantine-color-dark-4)',
              background: isHovering
                ? 'rgba(132,94,247,0.06)'
                : 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(16px)',
              boxShadow: isHovering || file
                ? '0 0 40px rgba(132,94,247,0.15)'
                : '0 8px 32px rgba(0,0,0,0.3)',
              transform: isHovering ? 'scale(1.015)' : 'scale(1)',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx"
            />

            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  <ThemeIcon size={80} radius="xl" variant="light" color="violet" mb="lg">
                    <IconCloudUpload size={40} />
                  </ThemeIcon>
                  <Title order={3} mb={4}>Drop your resume here</Title>
                  <Text c="dimmed" mb="xl" ta="center">Supports PDF, DOC, or DOCX up to 10MB</Text>
                  <Button variant="default" radius="xl" size="md">Browse Files</Button>
                </motion.div>
              ) : (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  <Box style={{ position: 'relative', marginBottom: rem(24) }}>
                    <ThemeIcon size={88} radius={rem(18)} variant="light" color="violet">
                      <IconFileText size={48} />
                    </ThemeIcon>
                    <Box
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'var(--mantine-color-green-6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--mantine-color-dark-7)',
                      }}
                    >
                      <IconCheck size={13} color="white" stroke={3} />
                    </Box>
                  </Box>

                  <Title order={4} mb={4} style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </Title>
                  <Text size="sm" c="dimmed" mb="xl">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Text>

                  <Group w="100%" grow>
                    <Button
                      variant="default"
                      radius="md"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      disabled={uploading}
                    >
                      Change File
                    </Button>
                    <Button
                      flex={2}
                      radius="md"
                      color="violet"
                      loading={uploading}
                      rightSection={!uploading && <IconChevronRight size={18} />}
                      onClick={(e) => { e.stopPropagation(); handleProceed(); }}
                      loaderProps={{ type: 'dots' }}
                    >
                      {uploading ? 'Uploading & Parsing...' : 'Parse & Continue'}
                    </Button>
                  </Group>
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>
        </motion.div>
      </Stack>
    </Box>
  );
}
