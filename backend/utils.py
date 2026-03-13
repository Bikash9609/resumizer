import pymupdf

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a given PDF file path using PyMuPDF."""
    text = ""
    try:
        doc = pymupdf.open(file_path)
        for page in doc:
            text += page.get_text("text") + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text.strip()
