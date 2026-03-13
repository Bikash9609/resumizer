import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Group, Text, Title, Button, ActionIcon, Badge,
  Container, Paper, Stack, Loader, Textarea, TextInput,
  Modal, Divider, useMantineColorScheme, Tooltip, Select, Menu, Collapse,
  rem, Grid
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconPlus, IconFileText, IconDotsVertical,
  IconSun, IconMoon, IconDownload, IconTrash,
  IconChevronDown, IconChevronUp, IconSearch, IconSparkles, IconLayoutDashboard
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
    setGeneratedResumes(prev => [{ id: tempId, title: 'Tailoring Resume...', status: 'generating', created_at: new Date().toISOString() }, ...prev]);

    try {
      await generateResume(activeBaseId, jdText, customInstructions, 'AI Tailored Resume', templateType);
      setJdText('');
      setCustomInstructions('');
      await loadData();
      notifications.show({ title: 'Success', message: 'The AI transformation has begun!', color: 'violet' });
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
      notifications.show({ title: 'Deleted', message: 'Resume removed.', color: 'gray' });
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, delay: i * 0.05 }}
    >
      <Paper
        withBorder
        mb="sm"
        p="md"
        radius="lg"
        className="resume-card"
        onClick={() => {
          if (!resume.isBase && resume.status === 'completed') {
            navigate(`/editor/${resume.rawId}`);
          }
        }}
        style={{
          cursor: !resume.isBase && resume.status === 'completed' ? 'pointer' : 'default',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          background: colorScheme === 'dark' ? 'rgba(37,38,43,0.4)' : '#fff',
        }}
      >
        <Group justify="space-between">
            <Group gap="md">
                <Box
                    style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: resume.isBase ? 'rgba(121,80,242,0.1)' : 'rgba(132,94,247,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    {resume.status === 'generating' ? (
                        <Loader size="xs" color="violet" />
                    ) : (
                        <IconFileText size={22} color="var(--mantine-color-violet-5)" />
                    )}
                </Box>
                <Box>
                    <Group gap="xs">
                        <Text fw={600} size="sm">{resume.title}</Text>
                        {resume.isBase && (
                            <Badge variant="dot" color="blue" size="xs">{isOlder ? 'Archive' : 'Core'}</Badge>
                        )}
                        {resume.status === 'generating' && (
                            <Badge variant="light" color="violet" size="xs" style={{ animation: 'pulse 1s infinite' }}>AI Tailoring...</Badge>
                        )}
                    </Group>
                    <Text size="xs" c="dimmed">{resume.date}</Text>
                </Box>
            </Group>

            <Group gap="xs">
                {resume.status === 'completed' && (
                    <>
                        {resume.isBase ? (
                            <Button
                                size="xs" variant="light" color="gray" radius="md"
                                leftSection={<IconDownload size={13} />}
                                onClick={(e) => { e.stopPropagation(); window.location.href = downloadBaseUrl(resume.rawId); }}
                            >
                                TXT
                            </Button>
                        ) : (
                            <>
                                <Group gap={4} visibleFrom="sm">
                                    <ActionIcon variant="light" color="gray" size="sm" radius="md" onClick={(e) => { e.stopPropagation(); handleDownload(resume.rawId, 'pdf'); }}>
                                        <IconDownload size={14} />
                                    </ActionIcon>
                                    <Button 
                                        size="xs" variant="light" color="violet" radius="md" 
                                        leftSection={<IconSparkles size={13} />}
                                        onClick={(e) => { e.stopPropagation(); navigate(`/editor/${resume.rawId}`); }}
                                    >
                                        Edit
                                    </Button>
                                </Group>
                                <Menu shadow="xl" width={160} radius="md">
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                                            <IconDotsVertical size={18} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Export</Menu.Label>
                                        <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => handleDownload(resume.rawId, 'pdf')}>PDF Format</Menu.Item>
                                        <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => handleDownload(resume.rawId, 'docx')}>Word Doc</Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDelete(resume.rawId)}>Delete Forever</Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </>
                        )}
                    </>
                )}
            </Group>
        </Group>
      </Paper>
    </motion.div>
  );

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--mantine-color-body)' }}>
      {/* Premium Navbar */}
      <Box
        component="nav"
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          backdropFilter: 'blur(20px)',
          background: colorScheme === 'dark' ? 'rgba(26,27,30,0.85)' : 'rgba(255,255,255,0.85)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Container size="lg" h={72}>
          <Group h="100%" justify="space-between">
            <Group gap="sm">
              <Box
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--mantine-color-violet-5), var(--mantine-color-indigo-6))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(132, 94, 247, 0.3)'
                }}
              >
                <IconLayoutDashboard size={22} color="white" />
              </Box>
              <Text fw={800} size="xl" style={{ letterSpacing: '-0.5px' }}>Resumizer</Text>
            </Group>

            <Group gap="md">
              <Tooltip label="Toggle Theme">
                <ActionIcon
                  variant="default" size="lg" radius="md"
                  onClick={() => toggleColorScheme()}
                >
                  {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                </ActionIcon>
              </Tooltip>
              <Button
                leftSection={<IconPlus size={18} />}
                radius="md" h={42} px="xl"
                gradient={{ from: 'violet', to: 'indigo' }} variant="gradient"
                onClick={() => setModalOpen(true)}
                loading={generating}
              >
                Create Tailored Resume
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box py={rem(60)} style={{ borderBottom: '1px solid var(--mantine-color-default-border)', background: 'var(--mantine-color-gray-0)' }} darkHidden>
        <Container size="lg">
            <Title order={1} style={{ fontSize: rem(42), fontWeight: 900, letterSpacing: '-1px' }} mb="xs">
                Welcome back, Hero.
            </Title>
            <Text c="dimmed" size="lg" maw={500}>
                Your library of career-defining documents, perfectly optimized for every opportunity.
            </Text>
        </Container>
      </Box>

      {/* Dark hero */}
      <Box py={rem(60)} style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', background: 'var(--mantine-color-dark-8)' }} lightHidden>
        <Container size="lg">
            <Title order={1} style={{ fontSize: rem(42), fontWeight: 900, letterSpacing: '-1px' }} mb="xs">
                Welcome back, Hero.
            </Title>
            <Text c="dimmed" size="lg" maw={500}>
                Your library of career-defining documents, perfectly optimized for every opportunity.
            </Text>
        </Container>
      </Box>

      {/* Main List */}
      <Container size="lg" py="xl">
        <Stack gap="xl">
            <Group justify="space-between" align="center">
                <Box>
                    <Group gap="xs" mb={4}>
                        <IconSparkles size={18} color="var(--mantine-color-violet-5)" />
                        <Text fw={700} tt="uppercase" size="xs" c="dimmed" lts="1px">Document Library</Text>
                    </Group>
                    <Title order={3}>All Resumes</Title>
                </Box>
                <TextInput
                    placeholder="Search by title or role..."
                    leftSection={<IconSearch size={16} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    radius="md" h={40}
                    style={{ width: 280 }}
                />
            </Group>

            <Box>
                {loading && activeItems.length === 0 ? (
                    <Stack align="center" py={60}><Loader color="violet" type="bars" /></Stack>
                ) : activeItems.length === 0 ? (
                    <Paper withBorder p={60} radius="xl" style={{ borderStyle: 'dashed', background: 'transparent' }}>
                        <Stack align="center" gap="md">
                            <IconFileText size={48} color="var(--mantine-color-dimmed)" />
                            <Title order={4}>Your library is empty</Title>
                            <Text c="dimmed" ta="center" maw={300}>Upload your base resume to start generating AI-optimized versions for your dream jobs.</Text>
                            <Button variant="light" color="violet" radius="md" onClick={() => setModalOpen(true)}>Get Started</Button>
                        </Stack>
                    </Paper>
                ) : (
                    <Box>
                        <AnimatePresence>
                            {activeItems.map((resume, i) => renderResumeRow(resume, i, false))}
                            
                            {olderItems.length > 0 && (
                                <Box mt="xl">
                                    <Divider label={
                                        <UnstyledButton onClick={() => setShowOlderBase(!showOlderBase)}>
                                            <Group gap="xs">
                                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Archive ({olderItems.length})</Text>
                                                {showOlderBase ? <IconChevronUp size={14}/> : <IconChevronDown size={14}/>}
                                            </Group>
                                        </UnstyledButton>
                                    } labelPosition="center" mb="lg" />
                                    <Collapse in={showOlderBase}>
                                        {olderItems.map((resume, i) => renderResumeRow(resume, i, true))}
                                    </Collapse>
                                </Box>
                            )}
                        </AnimatePresence>
                    </Box>
                )}
            </Box>
        </Stack>
      </Container>

      {/* Improved Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Group gap="xs"><IconSparkles size={24} color="violet" /><Title order={3}>Target New Role</Title></Group>}
        size="xl"
        radius="xl"
        centered
        overlayProps={{ blur: 8, opacity: 0.4 }}
        transitionProps={{ transition: 'slide-up' }}
      >
        <Stack gap="lg" p="md">
          <Textarea
            label="Job Description"
            description="Paste the full job posting text below"
            withAsterisk
            placeholder="We are looking for a Senior Software Engineer..."
            minRows={8}
            autosize
            radius="md"
            value={jdText}
            onChange={e => setJdText(e.target.value)}
          />

          <TextInput
            label="AI Creative Direction"
            description="Give the AI specific instructions for this version"
            placeholder="e.g. 'Focus on my leadership experience', 'Make it strictly 1 page'"
            radius="md"
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
          />

          <Grid>
            <Grid.Col span={12}>
                <Select
                    label="Visual Template"
                    description="Choose the aesthetic for your resume"
                    radius="md"
                    value={templateType}
                    onChange={(value) => setTemplateType(value || 'standard')}
                    data={[
                    { value: 'standard', label: 'Standard (Classic & Clean)' },
                    { value: 'modern', label: 'Modern (Professional Blue)' },
                    { value: 'compact', label: 'Compact (Maximum Density)' },
                    { value: 'creative', label: 'Creative (Modern Bold)' },
                    { value: 'executive', label: 'Executive (Elegant Serif)' },
                    ]}
                />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="subtle" color="gray" radius="md" onClick={() => setModalOpen(false)}>Maybe Later</Button>
            <Button
              gradient={{ from: 'violet', to: 'indigo' }} variant="gradient"
              radius="md" size="md" px="xl"
              disabled={!jdText.trim()}
              onClick={handleGenerate}
              leftSection={<IconSparkles size={18} />}
            >
              Generate Optimized Resume
            </Button>
          </Group>
        </Stack>
      </Modal>

      <style>{`
        .resume-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.05);
            border-color: var(--mantine-color-violet-2);
        }
        .mantine-color-scheme-dark .resume-card:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            border-color: var(--mantine-color-violet-9);
        }
        @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
}

const UnstyledButton = ({ children, onClick, style }: any) => (
    <Box component="button" onClick={onClick} style={{ 
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
        display: 'flex', alignItems: 'center', ...style 
    }}>
        {children}
    </Box>
);
