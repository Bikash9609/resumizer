import yaml
from pydantic import BaseModel
import litellm


class PromptConfig(BaseModel):
    system_prompt: str
    user_prompt_template: str


def load_prompts(yaml_path: str = "prompts.yaml") -> PromptConfig:
    with open(yaml_path, "r") as file:
        data = yaml.safe_load(file)

    return PromptConfig(
        system_prompt=data.get("resume_generation", {}).get("system_prompt", ""),
        user_prompt_template=data.get("resume_generation", {}).get(
            "user_prompt_template", ""
        ),
    )





def generate_tailored_resume(
    base_resume_text: str, job_description: str, custom_instructions: str = "", template_type: str = "standard"
) -> str:
    """
    Leverages LiteLLM to generate a strict, ATS-optimized tailored resume.
    """
    config = load_prompts()

    # Append template specific instructions
    template_instructions = f"\nPlease ensure the output is structured to suit a '{template_type}' resume format. Keep the markdown semantic but adjust verbosity and sections appropriately if needed."

    # Format the user prompt
    user_prompt = config.user_prompt_template.format(
        job_description=job_description,
        base_resume=base_resume_text,
        custom_instructions=custom_instructions + template_instructions,
    )

    messages = [
        {"role": "system", "content": config.system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        # Defaulting to a local ollama model for example (llama3 or mistral)
        # You can also use other providers by just changing the model string or env vars
        # For this to run locally seamlessly out-of-the-box, we'll assume a local model 'ollama/llama3'
        response = litellm.completion(
            model="ollama/llama3.2:latest",
            messages=messages,
            api_base="http://localhost:11434",  # default ollama endpoint
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating resume with LiteLLM: {e}")
        return "Error generating resume."

def update_resume_section(section_text: str, custom_instructions: str, full_markdown: str) -> str:
    """
    Leverages LiteLLM to update a specific section of the resume.
    """
    system_prompt = "You are an expert resume writer and career coach. Your goal is to rewrite a specific section of a user's resume according to their instructions. You will be given the full resume for context, the specific section to rewrite, and the instructions. Output ONLY the rewritten section in markdown format. Do not include any other text."
    user_prompt = f"""
Full Resume Context:
{full_markdown}

---
Section to Rewrite:
{section_text}

---
Instructions:
{custom_instructions}

Please rewrite the section based on the instructions. Output ONLY the rewritten section markdown.
"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        response = litellm.completion(
            model="ollama/llama3.2:latest",
            messages=messages,
            api_base="http://localhost:11434",
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error updating resume section with LiteLLM: {e}")
        return section_text  # return original if error
