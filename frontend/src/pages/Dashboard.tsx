import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Group, Text, Title, Button, ActionIcon, Badge,
  Container, Paper, Stack, Loader, Textarea, TextInput,
  Modal, Divider, useMantineColorScheme, Tooltip, Select, Menu, Collapse
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconPlus, IconFileText, IconDotsVertical,
  IconSun, IconMoon, IconDownload, IconTrash,
  IconChevronDown, IconChevronUp, IconSearch
} from '@tabler/icons-react';
import { fetchResumes, generateResume, downloadUrl, deleteGeneratedResume, downloadBaseUrl } from '../lib/api';

interface ResumeContext { id: number; filename: string; created_at: string; }
interface GeneratedResume { id: number; title: string; status: string; created_at: string; }

export default function Dashboard() {
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [baseContexts, setBaseContexts] = useState<ResumeContext[]>([]);
  const [generatedResumes, setGeneratedResumes] = useState<GeneratedResume[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showOlderBase, setShowOlderBase] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [jdText, setJdText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [templateType, setTemplateType] = useState('standard');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeBaseId] = useState(() => parseInt(localStorage.getItem('resumizer_base_id') || '0'));
  const [userId] = useState(() => parseInt(localStorage.getItem('resumizer_user_id') || '0'));

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }
    loadData(false, debouncedQuery);
    const interval = setInterval(() => loadData(true, debouncedQuery), 5000);
    return () => clearInterval(interval);
  }, [userId, navigate, debouncedQuery]);

  const loadData = async (silent = false, q = '') => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchResumes(userId, q);
      setBaseContexts(data.resumes);
      setGeneratedResumes(data.generated);
    } catch {
      if (!silent) notifications.show({ title: 'Error', message: 'Failed to load resumes', color: 'red' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!jdText.trim() || !activeBaseId) return;
    setModalOpen(false);
    setGenerating(true);

    const tempId = Math.floor(Math.random() * 100000);
    setGeneratedResumes(prev => [{ id: tempId, title: 'AI Tailored Resume', status: 'generating', created_at: new Date().toISOString() }, ...prev]);

    try {
      await generateResume(activeBaseId, jdText, customInstructions, 'AI Tailored Resume', templateType);
      setJdText('');
      setCustomInstructions('');
      await loadData();
      notifications.show({ title: 'Success', message: 'Resume generated!', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to start generation', color: 'red' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (id: number, format: 'pdf' | 'docx') => {
    window.location.href = downloadUrl(id, format);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteGeneratedResume(id);
      await loadData();
      notifications.show({ title: 'Success', message: 'Resume deleted!', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete resume', color: 'red' });
    }
  };

  const sortedBase = [...baseContexts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const activeBase = sortedBase.length > 0 ? sortedBase[0] : null;
  const olderBase = sortedBase.slice(1);

  const activeItems = [
    ...(activeBase ? [{ id: `base_${activeBase.id}`, title: activeBase.filename, isBase: true, status: 'completed', date: new Date(activeBase.created_at).toLocaleDateString(), rawId: activeBase.id }] : []),
    ...generatedResumes.map(g => ({ id: `gen_${g.id}`, title: g.title, isBase: false, status: g.status, date: new Date(g.created_at).toLocaleDateString(), rawId: g.id })),
  ];
  
  const olderItems = olderBase.map(c => ({ id: `base_${c.id}`, title: c.filename, isBase: true, status: 'completed', date: new Date(c.created_at).toLocaleDateString(), rawId: c.id }));

  const renderResumeRow = (resume: any, i: number, isOlder: boolean = false) => (
    <motion.div
      key={resume.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: i * 0.04 }}
    >
      {i > 0 && <Divider />}
      <Group
        p="md"
        justify="space-between"
        style={{
          transition: 'background 0.15s',
          cursor: 'default',
        }}
        className="resume-row"
      >
        {/* Left: icon + info */}
        <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
          <Box
            style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: resume.isBase ? 'rgba(121,80,242,0.12)' : 'rgba(132,94,247,0.1)',
              border: `1px solid ${resume.isBase ? 'rgba(121,80,242,0.3)' : 'rgba(132,94,247,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {resume.status === 'generating' ? (
              <Loader size="sm" color="violet" />
            ) : (
              <IconFileText size={22} color={resume.isBase ? 'var(--mantine-color-violet-4)' : 'var(--mantine-color-violet-5)'} />
            )}
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Group gap="xs" mb={2} wrap="nowrap">
              <Text fw={500} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                {resume.title}
              </Text>
              {resume.isBase && !isOlder && (
                <Badge size="xs" variant="light" color="violet" tt="uppercase">Active Base</Badge>
              )}
              {resume.isBase && isOlder && (
                <Badge size="xs" variant="outline" color="gray" tt="uppercase">Older Base</Badge>
              )}
              {resume.status === 'generating' && (
                <Badge size="xs" variant="light" color="yellow" tt="uppercase" style={{ animation: 'pulse 1.5s infinite' }}>
                  Generating…
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed">{resume.date}</Text>
          </Box>
        </Group>

        {/* Right: actions */}
        {resume.status === 'completed' && (
          <Group gap="xs">
            {resume.isBase ? (
              <Button
                size="xs"
                variant="default"
                radius="md"
                leftSection={<IconDownload size={13} />}
                onClick={() => { window.location.href = downloadBaseUrl(resume.rawId); }}
              >
                TXT
              </Button>
            ) : (
              <>
                <Button
                  size="xs"
                  variant="default"
                  radius="md"
                  leftSection={<IconDownload size={13} />}
                  onClick={() => handleDownload(resume.rawId, 'pdf')}
                >
                  PDF
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  radius="md"
                  leftSection={<IconDownload size={13} />}
                  onClick={() => handleDownload(resume.rawId, 'docx')}
                >
                  DOCX
                </Button>
                <Menu shadow="md" width={150}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size="md">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => handleDelete(resume.rawId)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </>
            )}
          </Group>
        )}
      </Group>
    </motion.div>
  );

  return (
    <Box style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <Paper
        component="nav"
        radius={0}
        withBorder
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          backdropFilter: 'blur(12px)',
          background: colorScheme === 'dark' ? 'rgba(26,27,30,0.75)' : 'rgba(255,255,255,0.8)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Container size="lg" h={64}>
          <Group h="100%" justify="space-between">
            <Group gap="xs">
              <Box
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: 'rgba(132,94,247,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <IconFileText size={20} color="var(--mantine-color-violet-5)" />
              </Box>
              <Text fw={700} size="lg">Resumizer</Text>
            </Group>

            <Group gap="sm">
              <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  onClick={() => toggleColorScheme()}
                  aria-label="Toggle theme"
                >
                  {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
              </Tooltip>
              <Button
                leftSection={<IconPlus size={16} />}
                radius="xl"
                color="violet"
                onClick={() => setModalOpen(true)}
                loading={generating}
              >
                Target New Role
              </Button>
            </Group>
          </Group>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container size="lg" py="xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Stack mb="lg" gap="md">
            <Group justify="space-between" align="flex-end">
              <Box>
                <Title order={2}>My Resumes</Title>
                <Text c="dimmed">Manage your base context and generated tailored resumes.</Text>
              </Box>
              <TextInput
                placeholder="Search resumes..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                radius="md"
                style={{ width: 250 }}
              />
            </Group>
          </Stack>

          <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
            {loading && activeItems.length === 0 && olderItems.length === 0 ? (
              <Stack align="center" justify="center" h={220}>
                <Loader color="violet" size="lg" />
              </Stack>
            ) : activeItems.length === 0 && olderItems.length === 0 ? (
              <Stack align="center" justify="center" h={220} gap="sm">
                <Box
                  style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'var(--mantine-color-dark-5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <IconFileText size={28} color="var(--mantine-color-dimmed)" />
                </Box>
                <Title order={4}>No resumes yet</Title>
                <Text c="dimmed" size="sm" ta="center" maw={320}>
                  Upload your base resume to start generating tailored versions.
                </Text>
              </Stack>
            ) : (
              <AnimatePresence>
                {activeItems.map((resume, i) => renderResumeRow(resume, i, false))}
                
                {olderItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Divider />
                    <Button 
                      variant="subtle" 
                      color="gray"
                      fullWidth 
                      radius={0}
                      onClick={() => setShowOlderBase(!showOlderBase)} 
                      rightSection={showOlderBase ? <IconChevronUp size={16}/> : <IconChevronDown size={16}/>}
                      style={{ height: 44 }}
                    >
                      Older Base Resumes ({olderItems.length})
                    </Button>
                    <Collapse in={showOlderBase}>
                      {olderItems.map((resume, i) => renderResumeRow(resume, i, true))}
                    </Collapse>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </Paper>
        </motion.div>
      </Container>

      {/* Generate Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Title order={3}>Target a New Role</Title>}
        size="lg"
        radius="lg"
        centered
        overlayProps={{ blur: 4 }}
      >
        <Stack gap="md">
          <Text c="dimmed" size="sm">Paste the job description to tailor your resume with AI.</Text>

          <Textarea
            label="Job Description"
            withAsterisk
            placeholder="Paste the raw text of the job description here..."
            minRows={6}
            autosize
            maxRows={12}
            radius="md"
            value={jdText}
            onChange={e => setJdText(e.target.value)}
          />

          <TextInput
            label="Additional Context"
            description="Optional guidance for the AI"
            placeholder="e.g. Focus heavily on my React experience over Angular"
            radius="md"
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
          />

          <Select
            label="Resume Template"
            description="Select the visual layout of your resume"
            radius="md"
            value={templateType}
            onChange={(value) => setTemplateType(value || 'standard')}
            data={[
              { value: 'standard', label: 'Standard' },
              { value: 'modern', label: 'Modern (Blue Accents)' },
              { value: 'compact', label: 'Compact (Space Saving)' },
              { value: 'creative', label: 'Creative (Serif, Red Accents)' },
              { value: 'executive', label: 'Executive (Classic Serif)' },
            ]}
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" radius="xl" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              color="violet"
              radius="xl"
              disabled={!jdText.trim()}
              onClick={handleGenerate}
            >
              Generate Resume
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
