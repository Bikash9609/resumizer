import yaml
from pydantic import BaseModel

class PromptConfig(BaseModel):
    system_prompt: str
    user_prompt_template: str

def load_prompts(yaml_path: str = "prompts.yaml") -> PromptConfig:
    with open(yaml_path, 'r') as file:
        data = yaml.safe_load(file)
    
    return PromptConfig(
        system_prompt=data.get('resume_generation', {}).get('system_prompt', ''),
        user_prompt_template=data.get('resume_generation', {}).get('user_prompt_template', '')
    )
    
import litellm

def generate_tailored_resume(base_resume_text: str, job_description: str, custom_instructions: str = "") -> str:
    """
    Leverages LiteLLM to generate a strict, ATS-optimized tailored resume.
    """
    config = load_prompts()
    
    # Format the user prompt
    user_prompt = config.user_prompt_template.format(
        job_description=job_description,
        base_resume=base_resume_text,
        custom_instructions=custom_instructions
    )
    
    messages = [
        {"role": "system", "content": config.system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        # Defaulting to a local ollama model for example (llama3 or mistral)
        # You can also use other providers by just changing the model string or env vars
        # For this to run locally seamlessly out-of-the-box, we'll assume a local model 'ollama/llama3'
        response = litellm.completion(
            model="ollama/llama3", 
            messages=messages,
            api_base="http://localhost:11434" # default ollama endpoint
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating resume with LiteLLM: {e}")
        return "Error generating resume."
