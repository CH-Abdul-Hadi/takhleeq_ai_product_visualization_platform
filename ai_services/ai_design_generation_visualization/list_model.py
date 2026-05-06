from google import genai
import os

# Use your API key directly or from environment variables
# api_key = os.getenv("GEMINI_API_KEY")

# Initialize the new Unified Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("List of models that support 'generateContent':\n")

# Use the new models.list() method
for model in client.models.list():
    # In the new SDK, we check 'supported_actions'
    if 'generateContent' in model.supported_actions:
        print(f"-> {model.name}")

print("\nList of models that support 'embedContent' (For Filtering):")
for model in client.models.list():
    if 'embedContent' in model.supported_actions:
        print(f"-> {model.name}")


        
print("\nList of models that support 'generateImages' (For Image Generation):")
for model in client.models.list():
    if 'generateImages' in model.supported_actions:
        print(f"-> {model.name}")