import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
import imagehash
from PIL import Image
import os
import json
import sys
import sys
sys.stdout.reconfigure(encoding='utf-8')


SCREENSHOT_DIR = os.path.join(os.getcwd(), "results", "screenshots")
files = os.listdir(SCREENSHOT_DIR)
student_folder = next((f for f in files if f.startswith("student_screenshots_")), None)
teacher_folder = next((f for f in files if f.startswith("teacher_screenshots_")), None)
# Paths to student and teacher screenshot folders
STUDENT_IMAGE_PATH = os.path.join(SCREENSHOT_DIR, student_folder)
TEACHER_IMAGE_PATH = os.path.join(SCREENSHOT_DIR, teacher_folder)

# Output file for storing the score
SCORE_OUTPUT_FILE = os.path.join(os.getcwd(), "results", "score_result.json")

def load_image(image_path):
    """Load an image from a file."""
    if not os.path.exists(image_path):
        print(f"❌ Error: Image not found -> {image_path}")
        return None
    return cv2.imread(image_path)

def compute_ssim(image1, image2):
    """Compute Structural Similarity Index (SSIM) between two images."""
    gray1 = cv2.cvtColor(image1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(image2, cv2.COLOR_BGR2GRAY)
    score = ssim(gray1, gray2)
    return max(0, score * 100)  # Ensure the score is non-negative

def compute_phash(image1_path, image2_path):
    """Compute Perceptual Hashing (pHash) similarity score."""
    hash1 = imagehash.phash(Image.open(image1_path))
    hash2 = imagehash.phash(Image.open(image2_path))
    similarity = max(0, 1 - (hash1 - hash2) / len(hash1.hash)) * 100  # Ensure non-negative
    return similarity

def compute_color_histogram_similarity(image1, image2):
    """Compare color histograms of two images."""
    hist1 = cv2.calcHist([image1], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist2 = cv2.calcHist([image2], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    
    hist1 = cv2.normalize(hist1, hist1).flatten()
    hist2 = cv2.normalize(hist2, hist2).flatten()
    
    score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)  # Correlation method
    return max(0, score * 100)  # Ensure non-negative

def compute_accessibility_score(image1, image2):
    """Compare Edge Maps to estimate accessibility and readability."""
    edges1 = cv2.Canny(cv2.cvtColor(image1, cv2.COLOR_BGR2GRAY), 100, 200)
    edges2 = cv2.Canny(cv2.cvtColor(image2, cv2.COLOR_BGR2GRAY), 100, 200)
    
    score, _ = ssim(edges1, edges2, full=True)
    return max(0, score * 100)  # Ensure non-negative

def compare_all_ui_similarities():
    """Compare all student screenshots with corresponding teacher screenshots and calculate an overall score."""
    
    if not student_folder or not teacher_folder:
        print("❌ Error: Screenshot folders not found")
        return 0
    
    student_images = sorted(os.listdir(STUDENT_IMAGE_PATH))
    teacher_images = sorted(os.listdir(TEACHER_IMAGE_PATH))
    
    total_design = total_structure = total_accessibility = total_color = total_final = 0
    image_count = 0
    
    detailed_results = []

    for filename in student_images:
        student_image_path = os.path.join(STUDENT_IMAGE_PATH, filename)
        teacher_image_path = os.path.join(TEACHER_IMAGE_PATH, filename)  

        if not os.path.exists(teacher_image_path):
            print(f"⚠️ Warning: No matching teacher screenshot for {filename}")
            continue

        student_img = load_image(student_image_path)
        teacher_img = load_image(teacher_image_path)

        if student_img is None or teacher_img is None:
            continue

        # Resize teacher image to match student image dimensions for comparison
        teacher_img = cv2.resize(teacher_img, (student_img.shape[1], student_img.shape[0]))

        # Compute similarity scores
        ssim_score = compute_ssim(student_img, teacher_img)  # Structure Score
        phash_score = compute_phash(student_image_path, teacher_image_path)  # Design Score
        color_score = compute_color_histogram_similarity(student_img, teacher_img)  # Color Contrast Score
        accessibility_score = compute_accessibility_score(student_img, teacher_img)  # Accessibility Score

        # Final weighted score per image
        final_score = (
            (phash_score * 0.40) +    # Design (40%)
            (ssim_score * 0.30) +     # Structure (30%)
            (accessibility_score * 0.15) +  # Accessibility (15%)
            (color_score * 0.15)      # Color Contrast (15%)
        )

        # Add to totals
        total_design += phash_score
        total_structure += ssim_score
        total_accessibility += accessibility_score
        total_color += color_score
        total_final += final_score
        image_count += 1

        # Store individual image results
        detailed_results.append({
            "filename": filename,
            "design_similarity": round(phash_score, 2),
            "structure_similarity": round(ssim_score, 2),
            "accessibility_similarity": round(accessibility_score, 2),
            "color_contrast_similarity": round(color_score, 2),
            "final_score": round(final_score, 2)
        })

        print(f"\n🔍 **Comparison for: {filename}**")
        print(f"🎨 Design Similarity: {phash_score:.2f}%")
        print(f"📌 Structure Similarity: {ssim_score:.2f}%")
        print(f"🛠️ Accessibility Similarity: {accessibility_score:.2f}%")
        print(f"🌈 Color Contrast Similarity: {color_score:.2f}%")
        print(f"\n✅ **Final UI Similarity Score for {filename}: {final_score:.2f}%**\n")

    # Calculate average scores
    if image_count > 0:
        avg_design = total_design / image_count
        avg_structure = total_structure / image_count
        avg_accessibility = total_accessibility / image_count
        avg_color = total_color / image_count
        avg_final = total_final / image_count

        print("\n📊 **Overall UI Similarity Report**")
        print(f"🎨 **Average Design Similarity**: {avg_design:.2f}%")
        print(f"📌 **Average Structure Similarity**: {avg_structure:.2f}%")
        print(f"🛠️ **Average Accessibility Similarity**: {avg_accessibility:.2f}%")
        print(f"🌈 **Average Color Contrast Similarity**: {avg_color:.2f}%")
        print(f"\n✅ **Final Overall UI Similarity Score**: {avg_final:.2f}%\n")
        
        # Save results to JSON file
        result_data = {
            "overall_score": round(avg_final, 2),
            "metrics": {
                "design": round(avg_design, 2),
                "structure": round(avg_structure, 2),
                "accessibility": round(avg_accessibility, 2),
                "color": round(avg_color, 2)
            },
            "detailed_results": detailed_results
        }
        
        os.makedirs(os.path.dirname(SCORE_OUTPUT_FILE), exist_ok=True)
        with open(SCORE_OUTPUT_FILE, 'w') as f:
            json.dump(result_data, f, indent=2)
            
        return avg_final
    else:
        print("\n❌ No valid images found for comparison.")
        return 0

if __name__ == "__main__":
    score = compare_all_ui_similarities()
    # Return the score as the exit code or in a format that can be captured
    print(f"FINAL_SCORE:{score}")
    sys.exit(0)