import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForObjectDetection
import numpy as np
import cv2
from typing import List, Tuple

class EnhancedObjectDetection:
    def __init__(self):
        # 1. Primary detector - OWL-ViT is superior to YOLO for industrial objects
        self.processor = AutoProcessor.from_pretrained("google/owlvit-base-patch32")
        self.model = AutoModelForObjectDetection.from_pretrained("google/owlvit-base-patch32")
        
        # 2. Domain-specific vocabulary for manufacturing
        self.manufacturing_vocabulary = [
            # Tools
            "screwdriver", "hammer", "wrench", "pliers", "saw", "drill", "clamp",
            "measuring tape", "level", "soldering iron", "multimeter", "caliper",
            
            # Safety equipment
            "safety glasses", "gloves", "mask", "hard hat", "ear protection", "safety boots",
            "face shield", "respirator", "safety harness", "fire extinguisher",
            
            # Materials
            "wood", "metal", "plastic", "wire", "pipe", "sheet metal", "circuit board",
            "resistor", "capacitor", "bolt", "screw", "nail", "washer", "nut",
            
            # Machinery
            "lathe", "milling machine", "cnc machine", "band saw", "drill press",
            "3d printer", "conveyor belt", "robot arm", "welding machine",
            
            # Workpieces
            "workpiece", "assembly", "component", "product", "prototype",
            
            # People
            "person", "worker", "technician", "engineer", "operator"
        ]
    
    def detect_objects(self, image: np.ndarray) -> Tuple[List[str], List[float], np.ndarray]:
        """
        Detect objects in the image with confidence scores and return annotated image
        """
        # Convert to PIL Image for OWL-ViT
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        # Process with OWL-ViT for precise detection
        inputs = self.processor(text=self.manufacturing_vocabulary, images=pil_image, return_tensors="pt")
        outputs = self.model(**inputs)
        
        # Convert outputs to normalized bounding boxes and scores
        target_sizes = torch.Tensor([pil_image.size[::-1]])
        results = self.processor.post_process_object_detection(
            outputs=outputs, 
            threshold=0.1,  # Lower threshold to catch more objects
            target_sizes=target_sizes
        )[0]
        
        # Extract detections
        boxes = results["boxes"].detach().numpy()
        scores = results["scores"].detach().numpy()
        labels = results["labels"].detach().numpy()
        
        # Get object names and convert boxes to supervision format
        detected_objects = [self.manufacturing_vocabulary[i] for i in labels]
        confidence_scores = scores.tolist()
        
        # Draw boxes on image - using basic OpenCV since supervision might not be installed
        annotated_image = image.copy()
        for box, label, score in zip(boxes, labels, scores):
            x1, y1, x2, y2 = box.astype(int)
            obj_name = self.manufacturing_vocabulary[label]
            
            # Draw rectangle
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw label
            label_text = f"{obj_name}: {score:.2f}"
            cv2.putText(annotated_image, label_text, (x1, y1-10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return detected_objects, confidence_scores, annotated_image