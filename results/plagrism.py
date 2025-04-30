# import os
# import numpy as np
# from pinecone import Pinecone, ServerlessSpec
# from sentence_transformers import SentenceTransformer

# API_KEY = "pcsk_258G7D_9ztWnjnYFWnFzXTTH3pcWjb8vrXQPycVFB4wkm6vq4NTDoCLSJY82AVGmZo3z8f"
# pc = Pinecone(api_key=API_KEY)
# index_name = "webvizio"
# index = None  # Initialize global variable

# def get_embedding_model():
#     models = [
#         ('all-mpnet-base-v2', 768),
#         ('all-MiniLM-L6-v2', 384),
#         ('multi-qa-MiniLM-L6-dot-v1', 384)
#     ]
#     for model_name, dimension in models:
#         try:
#             model = SentenceTransformer(model_name)
#             return model, dimension
#         except Exception as e:
#             print(f"Failed to load {model_name}: {e}")
#     raise ValueError("Could not load any embedding model")

# # Load embedding model
# embedding_model, VECTOR_DIMENSION = get_embedding_model()

# def get_or_create_index():
#     try:
#         # Check if index already exists
#         existing_indexes = pc.list_indexes().indexes
#         existing_index = next((idx for idx in existing_indexes if idx.name == index_name), None)

#         if existing_index:
#             print(f" Using existing index: {index_name}")
#             return pc.Index(index_name)

#         # If not exists, create
#         pc.create_index(
#             name=index_name,
#             dimension=VECTOR_DIMENSION,
#             metric="cosine",
#             spec=ServerlessSpec(cloud="aws", region="us-east-1")
#         )
#         print(f" Created new index: {index_name}")
#         return pc.Index(index_name)
#     except Exception as e:
#         print(f"Error while getting or creating index: {e}")
#         import traceback
#         traceback.print_exc()
#         return None

# def read_code_files(project_path):
#     code_content = []
#     try:
#         for root, _, files in os.walk(project_path):
#             for file in files:
#                 if file.endswith((".html", ".css", ".js", ".jsx", ".tsx", ".py", ".md", ".txt")):
#                     file_path = os.path.join(root, file)
#                     try:
#                         with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
#                             file_code = f.read()
#                             if file_code.strip():
#                                 code_content.append(file_code)
#                     except IOError as file_error:
#                         print(f"Error reading file {file_path}: {file_error}")
#         return "\n\n".join(code_content)
#     except Exception as e:
#         print(f"Error walking directory {project_path}: {e}")
#         return ""

# def generate_embedding(code):
#     return embedding_model.encode(code).tolist()

# def calculate_cosine_similarity(vector1, vector2):
#     vector1_np = np.array(vector1)
#     vector2_np = np.array(vector2)
#     dot_product = np.dot(vector1_np, vector2_np)
#     norm1 = np.linalg.norm(vector1_np)
#     norm2 = np.linalg.norm(vector2_np)
    
#     # Avoid division by zero
#     if norm1 == 0 or norm2 == 0:
#         return 0
    
#     return dot_product / (norm1 * norm2)

# def process_project(project_folder, student_id, stored_vectors=None):
#     global index
    
#     if not index:
#         print("Pinecone index not initialized. Skipping project.")
#         return None, None

#     try:
#         code = read_code_files(project_folder)
#         if not code:
#             print(f"No code content found for student ID {student_id}")
#             return None, None
            
#         vector = generate_embedding(code)
#         print(f" Code length for student ID {student_id}: {len(code)} characters")

#         # Check for plagiarism with stored vectors
#         plagiarism_detected = None
#         if stored_vectors:
#             for stored_id, stored_vector in stored_vectors.items():
#                 if stored_id != student_id:
#                     similarity = calculate_cosine_similarity(vector, stored_vector)
#                     print(f"Similarity between {student_id} and {stored_id}: {similarity*100:.2f}%")
#                     if similarity > 0.8:
#                         print(f" POTENTIAL PLAGIARISM DETECTED between {student_id} and {stored_id}")
#                         plagiarism_detected = stored_id  # Return the ID of the other student

#         # Store vector in Pinecone
#         try:
#             index.upsert([(student_id, vector)])
#             print(f" Stored student ID {student_id} in Pinecone.")
#         except Exception as e:
#             print(f"Error storing vector in Pinecone: {e}")

#         return plagiarism_detected, vector
#     except Exception as e:
#         print(f"Error processing project {student_id}: {e}")
#         import traceback
#         traceback.print_exc()
#         return None, None

# def main():
#     # Dynamically find the base projects folder
#     current_dir = os.path.dirname(os.path.abspath(__file__))
#     base_folder = os.path.join(current_dir, "projects")

#     print(" Looking for project folder at:", base_folder)

#     if not os.path.exists(base_folder):
#         print(f" Project folder {base_folder} does not exist.")
#         return None

#     # Ensure index is initialized
#     global index
#     index = get_or_create_index()
#     if not index:
#         print("Failed to initialize Pinecone index. Exiting.")
#         return None

#     # Dictionary to store vectors temporarily for comparison
#     stored_vectors = {}
    
#     # First pass: collect all vectors
#     for project_folder in os.listdir(base_folder):
#         if project_folder.startswith("student_project_"):
#             # Extract the ID after 'student_project_'
#             parts = project_folder.replace("student_project_", "").split('_')
#             student_id = parts[0]  # Extract just the student ID
#             project_path = os.path.join(base_folder, project_folder)

#             if os.path.isdir(project_path):
#                 _, vector = process_project(project_path, student_id)
#                 if vector:
#                     stored_vectors[student_id] = vector
#         else:
#             print(f" Skipping non-student project: {project_folder}")
    
#     # Second pass: check for plagiarism
#     for project_folder in os.listdir(base_folder):
#         if project_folder.startswith("student_project_"):
#             parts = project_folder.replace("student_project_", "").split('_')
#             student_id = parts[0]
#             project_path = os.path.join(base_folder, project_folder)

#             if os.path.isdir(project_path):
#                 plagiarism_id, _ = process_project(project_path, student_id, stored_vectors)
#                 if plagiarism_id:
#                     return plagiarism_id
    
#     return None

# if __name__ == "__main__":
#     plagiarism_id = main()
#     if plagiarism_id:
#         print(plagiarism_id)  # Only output the ID for easy parsing by JS
#     else:
#         print("")  # Empty string for no plagiarism





