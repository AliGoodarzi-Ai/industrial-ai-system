# PhD-Level Industrial AI with OWL-ViT + Affordance Theory

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Tuple
from datetime import datetime
import os
import uuid
import base64
import numpy as np
import cv2
import openai
from dotenv import load_dotenv
import torch
from PIL import Image
from transformers import OwlViTProcessor, OwlViTForObjectDetection

# Import your affordance analyzer
from affordance_analyzer import AffordanceAnalyzer

# Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI(title="PhD Industrial AI Assistant API", version="2.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AdvancedIndustrialDetector:
    """
    PhD-Level Object Detection combining OWL-ViT with Affordance Theory
    
    Research Contribution: Zero-shot detection of industrial objects with
    real-time affordance-based instruction generation
    """
    
    def __init__(self):
        print("🔬 Loading PhD-level detection system...")
        
        # 1. Load OWL-ViT with correct model classes
        self.processor = OwlViTProcessor.from_pretrained("google/owlvit-base-patch32")
        self.model = OwlViTForObjectDetection.from_pretrained("google/owlvit-base-patch32")
        print("✅ OWL-ViT model loaded")
        
        # 2. ENHANCED PhD Research: Manufacturing-specific vocabulary (REPLACE EXISTING)
        self.manufacturing_vocabulary = [
            # More Specific Person Terms
            "industrial worker", "machinist", "operator", "technician", "engineer", 
            "supervisor", "inspector", "apprentice", "person", "worker",
            
            # More Specific Equipment
            "CNC mill", "vertical mill", "horizontal mill", "milling machine",
            "precision lathe", "metal lathe", "turning machine", "lathe",
            "drill press", "band saw", "welding machine", "cnc machine",
            
            # More Specific Safety Terms
            "safety helmet", "hard hat", "protective helmet", "safety glasses",
            "protective glasses", "safety goggles", "work gloves", "safety gloves",
            "protective gloves", "face mask", "safety mask", "respirator",
            
            # Precision Tools
            "screwdriver", "hammer", "wrench", "pliers", "saw", "drill", "clamp",
            "measuring tape", "level", "soldering iron", "multimeter", "caliper",
            "micrometer", "torque wrench", "allen key", "file", "chisel",
            
            # Materials & Components
            "wood", "metal", "plastic", "wire", "pipe", "sheet metal", 
            "circuit board", "resistor", "capacitor", "bolt", "screw", 
            "nail", "washer", "nut", "bearing", "spring",
            
            # Workpieces & Assemblies
            "workpiece", "assembly", "component", "product", "prototype",
            "jig", "fixture", "template", "blueprint", "schematic",
            
            # Common Objects (for broader detection)
            "laptop", "computer", "phone", "tablet", "camera", "bottle", "cup",
            "pen", "pencil", "paper", "book", "chair", "table", "box",
            "scissors", "knife", "spoon", "fork"
        ]
        
        # 3. Initialize Affordance Theory Engine
        self.affordance_analyzer = AffordanceAnalyzer()
        print("✅ Affordance theory engine initialized")
        
    def detect_objects(self, image: np.ndarray) -> Tuple[List[str], List[float], np.ndarray]:
        """
        PhD Research Method: Zero-shot industrial object detection
        with confidence scoring and visual annotation
        """
        try:
            # Convert to PIL for OWL-ViT processing
            pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            # Process with OWL-ViT using manufacturing vocabulary
            inputs = self.processor(
                text=[[f"a photo of a {obj}" for obj in self.manufacturing_vocabulary]], 
                images=pil_image, 
                return_tensors="pt"
            )
            
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            # Post-process detections
            target_sizes = torch.Tensor([pil_image.size[::-1]])
            results = self.processor.post_process_object_detection(
                outputs=outputs,
                threshold=0.1,  # CHANGE THIS: Lower threshold for initial detection
                target_sizes=target_sizes
            )[0]
            
            if len(results["boxes"]) == 0:
                print("⚠️ No objects detected by OWL-ViT")
                return [], [], image
            
            # Extract detection data
            boxes = results["boxes"].detach().numpy()
            scores = results["scores"].detach().numpy()
            labels = results["labels"].detach().numpy()
            
            # Map to object names and filter by confidence
            detected_objects = []
            confidence_scores = []
            valid_boxes = []
            
            # Extract detection data with IMPROVED CONFIDENCE THRESHOLD
            for i, (box, score, label) in enumerate(zip(boxes, scores, labels)):
                if score > 0.25:  # 🎯 ADD THIS: Your improved confidence threshold
                    obj_name = self.manufacturing_vocabulary[label]
                    detected_objects.append(obj_name)
                    confidence_scores.append(float(score))
                    valid_boxes.append(box)
            
            # Create annotated image with professional styling
            annotated_image = self._create_professional_annotation(
                image, valid_boxes, detected_objects, confidence_scores
            )
            
            print(f"✅ OWL-ViT detected {len(detected_objects)} objects: {detected_objects}")
            return detected_objects, confidence_scores, annotated_image
            
        except Exception as e:
            print(f"⚠️ OWL-ViT detection error: {e}")
            import traceback
            traceback.print_exc()
            return [], [], image
    
    # 🎯 ADD THIS: Enhanced deduplication and filtering
    def deduplicate_objects(self, objects, confidences):
        """Smart deduplication considering object similarity"""
        # Group similar objects
        object_groups = {}
        for obj, conf in zip(objects, confidences):
            # Normalize object names
            base_name = obj.lower()
            
            # Group similar terms
            if any(term in base_name for term in ['mill', 'milling']):
                group_key = 'milling_machine'
            elif any(term in base_name for term in ['lathe', 'turning']):
                group_key = 'lathe'
            elif any(term in base_name for term in ['hat', 'helmet']):
                group_key = 'head_protection'
            elif any(term in base_name for term in ['glasses', 'goggles']):
                group_key = 'eye_protection'
            else:
                group_key = base_name.replace(' ', '_')
            
            if group_key not in object_groups:
                object_groups[group_key] = []
            object_groups[group_key].append((obj, conf))
        
        # Keep highest confidence from each group
        final_objects = []
        final_confidences = []
        
        for group, items in object_groups.items():
            best_item = max(items, key=lambda x: x[1])
            final_objects.append(best_item[0])
            final_confidences.append(best_item[1])
        
        return final_objects, final_confidences

    def _create_professional_annotation(self, image, boxes, objects, scores):
        """Create publication-quality annotated images"""
        annotated = image.copy()
        
        for box, obj_name, score in zip(boxes, objects, scores):
            x1, y1, x2, y2 = box.astype(int)
            
            # Color coding for different object types
            if any(tool in obj_name for tool in ["screwdriver", "hammer", "wrench", "drill"]):
                color = (0, 165, 255)  # Orange for tools
            elif any(safety in obj_name for safety in ["safety", "gloves", "mask", "hat"]):
                color = (0, 255, 0)    # Green for safety
            elif "person" in obj_name:
                color = (255, 0, 0)    # Red for people
            else:
                color = (255, 255, 0)  # Cyan for other objects
            
            # Draw professional bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            # Draw label with background
            label_text = f"{obj_name}: {score:.2f}"
            text_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            cv2.rectangle(annotated, (x1, y1-text_size[1]-10), 
                         (x1+text_size[0], y1), color, -1)
            cv2.putText(annotated, label_text, (x1, y1-5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        return annotated

# Initialize detection system
print("🚀 Initializing PhD Industrial AI System...")
detector = AdvancedIndustrialDetector()
print("✅ System ready for research!")

# Pydantic models for API
class AnalysisRequest(BaseModel):
    image_base64: str
    analysis_type: str = "comprehensive"

class AnalysisResponse(BaseModel):
    id: str
    timestamp: str
    detected_objects: List[str]
    confidence_scores: List[float]
    task_phase: str
    expert_analysis: str
    safety_assessment: str
    next_steps: str
    image_url: str

class SystemStatus(BaseModel):
    status: str
    owlvit_loaded: bool
    affordance_engine: bool
    openai_connected: bool
    total_analyses: int

# Storage
analysis_history = []
os.makedirs("static", exist_ok=True)

@app.get("/", response_model=SystemStatus)
async def get_system_status():
    """System status for PhD research system"""
    return SystemStatus(
        status="operational",
        owlvit_loaded=True,
        affordance_engine=True,
        openai_connected=openai.api_key is not None,
        total_analyses=len(analysis_history)
    )

@app.post("/analyze/image", response_model=AnalysisResponse)
async def analyze_image(request: AnalysisRequest):
    """
    PhD Research Method: Comprehensive industrial image analysis
    combining zero-shot detection with affordance theory
    """
    try:
        print("🔬 Starting PhD-level analysis...")
        
        # Decode image
        image_data_str = request.image_base64
        if ',' in request.image_base64:
            _, image_data_str = request.image_base64.split(',', 1)
        
        image_data = base64.b64decode(image_data_str)
        image_array = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
        
        if image_array is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        print(f"📐 Image shape: {image_array.shape}")
        
        # 1. Advanced Object Detection with OWL-ViT
        print("🎯 Running zero-shot industrial object detection...")
        detected_objects, confidence_scores, annotated_frame = detector.detect_objects(image_array)
        
        # 🎯 ADD THIS: Enhanced deduplication and filtering
        detected_objects, confidence_scores = detector.deduplicate_objects(detected_objects, confidence_scores)
        
        # 2. Affordance Theory Analysis
        print("🧠 Applying affordance theory...")
        affordance_guidance = detector.affordance_analyzer.generate_guidance(detected_objects)
        
        # 3. Generate Expert Analysis using GPT-4 with ENHANCED PROMPT
        if openai.api_key and detected_objects:
            # 🎯 REPLACE THIS SECTION with enhanced context prompt:
            expert_prompt = f"""
            As a PhD-level manufacturing engineer, analyze this industrial workshop image showing {', '.join(detected_objects)}.
            
            Focus on:
            1. Specific manufacturing processes (machining, assembly, welding)
            2. Workplace safety compliance and PPE usage
            3. Equipment utilization and workflow efficiency
            4. Quality control implications
            
            Consider the affordance relationships between tools, workers, and tasks.
            
            DETECTED OBJECTS: {', '.join(detected_objects)}
            TASK PHASE: {affordance_guidance['task_phase']}
            
            Provide expert-level analysis covering:
            1. Manufacturing Process Identification:
               - What specific processes are being performed?
               - What equipment capabilities are being utilized?
            
            2. Safety Protocol Assessment:
               - PPE compliance status
               - Potential safety hazards or improvements
            
            3. Efficiency Optimization Recommendations:
               - Workflow improvements
               - Equipment utilization suggestions
            
            4. Quality Assurance Considerations:
               - Process control measures
               - Inspection and verification needs
            
            Keep response detailed but structured.
            """
            
            try:
                response = openai.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": expert_prompt}],
                    max_tokens=500,  # Increased for more detailed analysis
                    temperature=0.7  # Slightly more creative while staying factual
                )
                expert_analysis = response.choices[0].message.content
                print("✅ Enhanced GPT-4 analysis generated")
            except Exception as gpt_error:
                print(f"⚠️ GPT-4 error: {gpt_error}")
                expert_analysis = affordance_guidance['summary']
        else:
            expert_analysis = affordance_guidance['summary']
        
        # 4. Safety Assessment
        safety_items = [obj for obj in detected_objects if any(
            safety in obj.lower() for safety in ['safety', 'gloves', 'mask', 'hat', 'protection']
        )]
        
        if safety_items:
            safety_assessment = f"✅ Safety equipment detected: {', '.join(safety_items)}. Good safety practices observed."
        else:
            safety_assessment = "⚠️ No safety equipment detected. Ensure appropriate PPE for industrial tasks."
        
        # 5. Save results
        analysis_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        image_filename = f"phd_analysis_{analysis_id}.jpg"
        cv2.imwrite(f"static/{image_filename}", annotated_frame)
        
        # 6. Create comprehensive response
        response = AnalysisResponse(
            id=analysis_id,
            timestamp=timestamp,
            detected_objects=detected_objects,
            confidence_scores=confidence_scores,
            task_phase=affordance_guidance['task_phase'],
            expert_analysis=expert_analysis,
            safety_assessment=safety_assessment,
            next_steps=affordance_guidance.get('next_steps', 'Continue with current task sequence'),
            image_url=f"/static/{image_filename}"
        )
        
        analysis_history.append(response.dict())
        print(f"✅ PhD analysis complete: {analysis_id}")
        
        return response
        
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    print("🎓 Starting PhD Industrial AI Research System...")
    print("📡 API Documentation: http://localhost:8000/docs")
    print("🔬 Research Focus: Affordance Theory + Zero-Shot Detection")
    print("🏭 Application: Human-Centric Collaborative Fieldwork")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)