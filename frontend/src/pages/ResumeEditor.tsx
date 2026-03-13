import {useState, useEffect} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {
  Box,
  Container,
  Group,
  Text,
  Title,
  Button,
  ActionIcon,
  ScrollArea,
  Paper,
  Stack,
  Loader,
  Textarea,
  Divider,
  Select,
  Badge,
  Grid,
  TextInput,
  Tooltip,
  UnstyledButton,
  rem,
} from "@mantine/core";
import {notifications} from "@mantine/notifications";
import {
  IconArrowLeft,
  IconDownload,
  IconDeviceFloppy,
  IconHistory,
  IconSparkles,
  IconCheck,
  IconX,
  IconEdit,
  IconExternalLink,
} from "@tabler/icons-react";
import {motion, AnimatePresence} from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  getGeneratedResume,
  updateResumeSection,
  updateResumeMarkdown,
  downloadUrl,
} from "../lib/api";
import {splitMarkdownIntoSections} from "../lib/markdownUtils";

interface ResumeVersion {
  id: number;
  markdown_content: string;
  created_at: string;
}

interface GeneratedResume {
  id: number;
  title: string;
  generated_markdown: string;
  template_type: string;
  status: string;
  versions: ResumeVersion[];
}

export default function ResumeEditor() {
  const {id} = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState<GeneratedResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable Title
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  // Left Panel state
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(
    null,
  );
  const [sectionInstructions, setSectionInstructions] = useState("");
  const [processingSection, setProcessingSection] = useState(false);

  // Right Panel State (Sections)
  const [markdownSections, setMarkdownSections] = useState<string[]>([]);

  // Version History
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (id) {
      loadResume(parseInt(id));
    }
  }, [id]);

  const loadResume = async (resumeId: number) => {
    try {
      setLoading(true);
      const data = await getGeneratedResume(resumeId);
      setResume(data);
      setTempTitle(data.title);
      setMarkdownSections(
        splitMarkdownIntoSections(data.generated_markdown || ""),
      );
      setSelectedVersionId("current");
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to load resume",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSection = async () => {
    if (!resume || activeSectionIndex === null || !sectionInstructions.trim())
      return;

    const sectionToUpdate = markdownSections[activeSectionIndex];
    setProcessingSection(true);

    try {
      const updatedResume = await updateResumeSection(
        resume.id,
        sectionToUpdate,
        sectionInstructions,
      );
      setResume(updatedResume);
      setMarkdownSections(
        splitMarkdownIntoSections(updatedResume.generated_markdown),
      );
      setSectionInstructions("");
      setActiveSectionIndex(null);
      notifications.show({
        title: "Success",
        message: "Magic rewrite complete!",
        color: "violet",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update section",
        color: "red",
      });
    } finally {
      setProcessingSection(false);
    }
  };

  const handleSaveFull = async () => {
    if (!resume) return;
    setSaving(true);
    try {
      const fullMarkdown = markdownSections.join("\n");
      const updatedResume = await updateResumeMarkdown(
        resume.id,
        fullMarkdown,
        tempTitle,
      );
      setResume({...updatedResume});
      setEditingTitle(false);
      notifications.show({
        title: "Saved",
        message: "All changes synchronized.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save changes",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (format: "pdf" | "docx") => {
    if (!resume) return;
    window.location.href = downloadUrl(resume.id, format);
  };

  const handleVersionChange = (val: string | null) => {
    if (!val || !resume) return;
    setSelectedVersionId(val);
    if (val === "current") {
      setMarkdownSections(splitMarkdownIntoSections(resume.generated_markdown));
    } else {
      const v = resume.versions.find((ver) => ver.id.toString() === val);
      if (v) {
        setMarkdownSections(splitMarkdownIntoSections(v.markdown_content));
      }
    }
  };

  const renderLeftPanel = () => {
    return (
      <Stack h="100%" gap="xl">
        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm" tt="uppercase" c="dimmed" lts="1px">
              Editor Toolkit
            </Text>
            {selectedVersionId !== "current" && (
              <Badge color="orange" variant="light">
                Viewing History
              </Badge>
            )}
          </Group>

          {resume?.versions && resume.versions.length > 0 && (
            <Select
              label="Version History"
              placeholder="Select a version"
              value={selectedVersionId}
              onChange={handleVersionChange}
              data={[
                {value: "current", label: "Current Working Draft"},
                ...resume.versions
                  .slice()
                  .reverse()
                  .map((v, i) => ({
                    value: v.id.toString(),
                    label: `Version ${resume.versions.length - i} (${new Date(v.created_at).toLocaleTimeString()})`,
                  })),
              ]}
              leftSection={<IconHistory size={16} />}
              radius="md"
              mb="md"
            />
          )}
        </Box>

        <AnimatePresence mode="wait">
          {activeSectionIndex !== null ? (
            <motion.div
              key="edit-form"
              initial={{opacity: 0, x: -20}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: -20}}
              transition={{duration: 0.2}}>
              <Paper
                withBorder
                p="md"
                radius="lg"
                shadow="sm"
                style={{borderLeft: "4px solid var(--mantine-color-violet-5)"}}>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconSparkles
                        size={20}
                        color="var(--mantine-color-violet-5)"
                      />
                      <Text fw={600}>Refine Section</Text>
                    </Group>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => setActiveSectionIndex(null)}>
                      <IconX size={18} />
                    </ActionIcon>
                  </Group>

                  <Box
                    bg="var(--mantine-color-gray-0)"
                    p="sm"
                    style={{ borderRadius: '8px' }}
                    className="mantine-visible-light"
                  >
                    <Text size="xs" c="dimmed" lineClamp={3}>
                      "{markdownSections[activeSectionIndex].substring(0, 150)}
                      ..."
                    </Text>
                  </Box>
                  <Box
                    bg="var(--mantine-color-dark-8)"
                    p="sm"
                    style={{ borderRadius: '8px' }}
                    className="mantine-hidden-light"
                  >
                    <Text size="xs" c="dimmed" lineClamp={3}>
                      "{markdownSections[activeSectionIndex].substring(0, 150)}
                      ..."
                    </Text>
                  </Box>

                  <Textarea
                    label="What should the AI change?"
                    placeholder="e.g. 'Make it more quantitative', 'Focus on my leadership', 'Use stronger action verbs'..."
                    minRows={4}
                    autosize
                    maxRows={8}
                    radius="md"
                    value={sectionInstructions}
                    onChange={(e) => setSectionInstructions(e.target.value)}
                  />

                  <Button
                    fullWidth
                    gradient={{from: "violet", to: "indigo"}}
                    variant="gradient"
                    loading={processingSection}
                    onClick={handleUpdateSection}
                    radius="md"
                    h={44}>
                    Apply Magic Transformation
                  </Button>
                </Stack>
              </Paper>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{delay: 0.1}}>
              <Paper
                withBorder
                p="xl"
                radius="lg"
                style={{borderStyle: "dashed", background: "transparent"}}>
                <Stack align="center" gap="sm" ta="center">
                  <Box
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "rgba(132,94,247,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <IconSparkles
                      size={24}
                      color="var(--mantine-color-violet-5)"
                    />
                  </Box>
                  <Text fw={600} size="sm">
                    Select a section to begin
                  </Text>
                  <Text size="xs" c="dimmed">
                    Click on any part of the resume preview on the right to
                    start AI-powered editing.
                  </Text>
                </Stack>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>

        <Divider />

        <Box>
          <Text fw={700} size="sm" tt="uppercase" c="dimmed" lts="1px" mb="xs">
            Tips
          </Text>
          <Stack gap="xs">
            <Group gap="xs">
              <Badge color="blue" size="xs" circle variant="filled" />
              <Text size="xs">Click any section to edit it specifically.</Text>
            </Group>
            <Group gap="xs">
              <Badge color="blue" size="xs" circle variant="filled" />
              <Text size="xs">Use Version History to undo AI changes.</Text>
            </Group>
            <Group gap="xs">
              <Badge color="blue" size="xs" circle variant="filled" />
              <Text size="xs">Save your work once you are satisfied.</Text>
            </Group>
          </Stack>
        </Box>
      </Stack>
    );
  };

  const getTemplateClass = () => {
    switch (resume?.template_type) {
      case "modern":
        return "template-modern";
      case "compact":
        return "template-compact";
      case "creative":
        return "template-creative";
      case "executive":
        return "template-executive";
      default:
        return "template-standard";
    }
  };

  if (loading)
    return (
      <Stack align="center" justify="center" h="100vh" gap="md">
        <Loader color="violet" size="xl" type="dots" />
        <Text c="dimmed" fw={500} style={{animation: "pulse 1.5s infinite"}}>
          Gearing up your resume workspace...
        </Text>
      </Stack>
    );

  if (!resume)
    return (
      <Stack align="center" justify="center" h="100vh">
        <Text>Resume not found</Text>
      </Stack>
    );

  return (
    <Box
      h="100vh"
      display="flex"
      style={{
        flexDirection: "column",
        background: "var(--mantine-color-body)",
      }}>
      {/* Top Bar - Refined */}
      <Paper
        p="xs"
        withBorder
        radius={0}
        style={{
          zIndex: 10,
          backdropFilter: "blur(10px)",
          background: "rgba(255,255,255,0.8)",
        }}
        className="mantine-visible-light">
        <Group justify="space-between" align="center" px="md">
          <Group gap="xl">
            <UnstyledButton
              onClick={() => navigate("/dashboard")}
              style={{display: "flex", alignItems: "center", gap: 8}}>
              <IconArrowLeft size={18} color="var(--mantine-color-dimmed)" />
              <Text size="sm" fw={600} c="dimmed">
                Dashboard
              </Text>
            </UnstyledButton>

            <Divider orientation="vertical" />

            <Group gap="xs">
              {editingTitle ? (
                <Group gap="xs">
                  <TextInput
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.currentTarget.value)}
                    size="sm"
                    variant="filled"
                    autoFocus
                    onBlur={() =>
                      tempTitle === resume.title && setEditingTitle(false)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSaveFull()}
                  />
                  <ActionIcon
                    color="green"
                    variant="light"
                    onClick={handleSaveFull}
                    loading={saving}>
                    <IconCheck size={16} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group gap="xs">
                  <Title
                    order={3}
                    style={{cursor: "pointer"}}
                    onClick={() => setEditingTitle(true)}>
                    {tempTitle}
                  </Title>
                  <Tooltip label="Edit Title">
                    <ActionIcon
                      variant="transparent"
                      size="sm"
                      c="dimmed"
                      onClick={() => setEditingTitle(true)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Group>
          </Group>

          <Group gap="sm">
            <Group
              gap={0}
              bg="var(--mantine-color-gray-1)"
              p={4}
              style={{borderRadius: 8}}>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                radius="sm"
                leftSection={<IconDownload size={14} />}
                onClick={() => handleDownload("pdf")}>
                PDF
              </Button>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                radius="sm"
                leftSection={<IconExternalLink size={14} />}
                onClick={() => handleDownload("docx")}>
                DOCX
              </Button>
            </Group>
            <Button
              size="sm"
              color="violet"
              radius="md"
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saving}
              onClick={handleSaveFull}
              disabled={selectedVersionId !== "current"}>
              Save Changes
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Dark mode header */}
      <Paper
        p="xs"
        withBorder
        radius={0}
        style={{
          zIndex: 10,
          backdropFilter: "blur(10px)",
          background: "rgba(26,27,30,0.8)",
        }}
        className="mantine-hidden-light">
        <Group justify="space-between" align="center" px="md">
          <Group gap="xl">
            <UnstyledButton
              onClick={() => navigate("/dashboard")}
              style={{display: "flex", alignItems: "center", gap: 8}}>
              <IconArrowLeft size={18} color="var(--mantine-color-dimmed)" />
              <Text size="sm" fw={600} c="dimmed">
                Dashboard
              </Text>
            </UnstyledButton>
            <Divider orientation="vertical" />
            <Group gap="xs">
              {editingTitle ? (
                <Group gap="xs">
                  <TextInput
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.currentTarget.value)}
                    size="sm"
                    variant="filled"
                    autoFocus
                    onBlur={() =>
                      tempTitle === resume.title && setEditingTitle(false)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSaveFull()}
                  />
                  <ActionIcon
                    color="green"
                    variant="light"
                    onClick={handleSaveFull}
                    loading={saving}>
                    <IconCheck size={16} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group gap="xs">
                  <Title
                    order={3}
                    style={{cursor: "pointer"}}
                    onClick={() => setEditingTitle(true)}>
                    {tempTitle}
                  </Title>
                  <Tooltip label="Edit Title">
                    <ActionIcon
                      variant="transparent"
                      size="sm"
                      c="dimmed"
                      onClick={() => setEditingTitle(true)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Group>
          </Group>
          <Group gap="sm">
            <Group
              gap={0}
              bg="var(--mantine-color-dark-6)"
              p={4}
              style={{borderRadius: 8}}>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                radius="sm"
                leftSection={<IconDownload size={14} />}
                onClick={() => handleDownload("pdf")}>
                PDF
              </Button>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                radius="sm"
                leftSection={<IconExternalLink size={14} />}
                onClick={() => handleDownload("docx")}>
                DOCX
              </Button>
            </Group>
            <Button
              size="sm"
              color="violet"
              radius="md"
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saving}
              onClick={handleSaveFull}
              disabled={selectedVersionId !== "current"}>
              Save Changes
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Editor Split */}
      <Grid gutter={0} style={{flexGrow: 1, overflow: "hidden"}}>
        {/* Left Panel - 40% */}
        <Grid.Col
          span={4}
          style={{
            borderRight: "1px solid var(--mantine-color-default-border)",
            background: "var(--mantine-color-body)",
          }}>
          <ScrollArea h="calc(100vh - 61px)" p="xl">
            {renderLeftPanel()}
          </ScrollArea>
        </Grid.Col>

        {/* Right Panel - Preview 60% */}
        <Grid.Col span={8} style={{overflow: "hidden"}}>
          <ScrollArea
            h="calc(100vh - 61px)"
            p="xl"
            bg="var(--mantine-color-gray-1)"
            className="mantine-visible-light">
            <Container size="sm" py="xl">
              <Paper
                shadow="xl"
                p={rem(60)}
                radius="sm"
                bg="white"
                className={`resume-preview ${getTemplateClass()}`}
                style={{minHeight: "1100px", border: "1px solid #ddd"}}>
                {markdownSections.map((sec, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setActiveSectionIndex(idx)}
                    className={`selectable-section-wrapper ${activeSectionIndex === idx ? "section-active" : ""}`}>
                    <div className="resume-markdown-content">
                      <ReactMarkdown>{sec}</ReactMarkdown>
                    </div>
                  </Box>
                ))}
              </Paper>
            </Container>
          </ScrollArea>

          <ScrollArea
            h="calc(100vh - 61px)"
            p="xl"
            bg="var(--mantine-color-dark-9)"
            className="mantine-hidden-light">
            <Container size="sm" py="xl">
              <Paper
                shadow="xl"
                p={rem(60)}
                radius="sm"
                bg="white"
                className={`resume-preview preview-on-dark ${getTemplateClass()}`}
                style={{minHeight: "1100px", border: "1px solid #333"}}>
                {markdownSections.map((sec, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setActiveSectionIndex(idx)}
                    className={`selectable-section-wrapper ${activeSectionIndex === idx ? "section-active" : ""}`}>
                    <div className="resume-markdown-content">
                      <ReactMarkdown>{sec}</ReactMarkdown>
                    </div>
                  </Box>
                ))}
              </Paper>
            </Container>
          </ScrollArea>
        </Grid.Col>
      </Grid>

      <style>{`
        .resume-preview { 
            color: #111; 
            line-height: 1.5;
            transition: all 0.3s ease;
        }
        
        /* Darker text for resume preview on white paper even in dark mode */
        .preview-on-dark {
            color: #111 !important;
        }

        .selectable-section-wrapper {
            cursor: pointer; 
            padding: 8px 12px;
            margin: -8px -12px;
            border-radius: 6px;
            border: 2px solid transparent;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        
        .selectable-section-wrapper:hover {
            background: rgba(132, 94, 247, 0.04);
            border-color: rgba(132, 94, 247, 0.15);
        }
        
        .selectable-section-wrapper.section-active {
            background: rgba(132, 94, 247, 0.08);
            border-color: var(--mantine-color-violet-5);
            box-shadow: 0 4px 12px rgba(132, 94, 247, 0.1);
            z-index: 1;
        }
        
        .resume-markdown-content h1 { font-size: 24pt; margin-bottom: 20px; }
        .resume-markdown-content h2 { font-size: 16pt; margin-top: 15px; margin-bottom: 10px; font-weight: 700; color: #333; }
        .resume-markdown-content p { margin-bottom: 8px; font-size: 11pt; }
        .resume-markdown-content ul { padding-left: 20px; margin-bottom: 12px; }
        .resume-markdown-content li { margin-bottom: 4px; font-size: 11pt; }

        .template-standard { font-family: 'Times New Roman', Times, serif; }
        .template-standard h1, .template-standard h2 { border-bottom: 1px solid #ccc; }
        
        .template-modern { font-family: 'Inter', sans-serif; }
        .template-modern h1 { color: #2c3e50; border-bottom: 3px solid #3498db; }
        .template-modern h2 { color: #2980b9; border-left: 4px solid #3498db; padding-left: 10px; }
        
        .template-compact { font-family: 'Inter', sans-serif; font-size: 10pt; }
        .template-compact .resume-markdown-content p, .template-compact .resume-markdown-content li { font-size: 10pt; }
        .template-compact .resume-markdown-content h2 { margin-top: 8px; margin-bottom: 4px; font-size: 12pt; }
        
        .template-creative { font-family: 'Raleway', sans-serif; }
        .template-creative h1 { color: #e74c3c; text-align: center; text-transform: uppercase; letter-spacing: 4px; border: none; }
        .template-creative h2 { color: #c0392b; border-bottom: 2px dashed #e74c3c; }
        
        .template-executive { font-family: 'Playfair Display', serif; }
        .template-executive h1 { text-align: center; font-size: 28pt; font-weight: 400; }
        .template-executive h2 { border-bottom: 1px solid #000; text-transform: uppercase; font-weight: 500; letter-spacing: 1px; }

        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }

        /* Essential visibility fix for theme-switched elements */
        [data-mantine-color-scheme="dark"] .mantine-visible-light { display: none !important; }
        [data-mantine-color-scheme="light"] .mantine-hidden-light { display: none !important; }
      `}</style>
    </Box>
  );
}
