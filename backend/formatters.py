from markdown_pdf import MarkdownPdf, Section
from docx import Document
import io

def generate_pdf_from_markdown(markdown_content: str) -> io.BytesIO:
    """Creates a PDF from a Markdown string."""
    pdf = MarkdownPdf(toc_level=2)
    pdf.add_section(Section(markdown_content))
    
    # Save to a bytes buffer
    buffer = io.BytesIO()
    # The markdown-pdf library usually writes to a file path
    # A simple trick is to write it to a temp file and read it back, but let's try writing to buffer if supported, or temp file.
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        temp_path = tmp.name
        
    pdf.save(temp_path)
    
    with open(temp_path, "rb") as f:
        buffer.write(f.read())
        
    os.remove(temp_path)
    buffer.seek(0)
    return buffer

def generate_docx_from_markdown(markdown_content: str) -> io.BytesIO:
    """Creates a very basic DOCX from Markdown (simplified for prototype)."""
    document = Document()
    document.add_heading('Generated Resume', 0)
    
    # Extremely simplified parsing - for a real app, use a proper md to docx library like pypandoc
    for line in markdown_content.split('\n'):
        if line.startswith('#'):
            level = line.count('#')
            text = line.replace('#', '').strip()
            document.add_heading(text, level=min(level, 9))
        else:
            document.add_paragraph(line)
            
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer
