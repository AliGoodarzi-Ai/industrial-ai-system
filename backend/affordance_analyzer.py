from typing import List, Dict, Any

class AffordanceAnalyzer:
    def __init__(self):
        # Object affordances mapping (Gibson's affordance theory)
        self.affordances = {
            "screwdriver": ["turning", "poking", "prying", "tightening", "loosening"],
            "hammer": ["hitting", "striking", "pulling", "driving", "breaking"],
            "wrench": ["turning", "gripping", "twisting", "tightening", "holding"],
            "pliers": ["gripping", "cutting", "bending", "holding", "twisting"],
            "drill": ["drilling", "boring", "rotating", "piercing", "making holes"],
            "person": ["working", "operating", "manipulating", "controlling", "observing"],
            "laptop": ["computing", "monitoring", "controlling", "programming", "analyzing"],
            "phone": ["communicating", "documenting", "measuring", "recording"],
            "bottle": ["containing", "pouring", "storing", "measuring"],
            "cup": ["containing", "drinking", "measuring", "holding"],
            "scissors": ["cutting", "trimming", "shearing", "snipping"],
            "knife": ["cutting", "slicing", "scraping", "trimming"],
        }
        
        # Task phase patterns
        self.task_patterns = {
            "ASSEMBLY_PHASE": ["screwdriver", "wrench", "person", "drill"],
            "MAINTENANCE_PHASE": ["wrench", "screwdriver", "hammer", "person"],
            "MEASUREMENT_PHASE": ["laptop", "phone", "person"],
            "CUTTING_PHASE": ["scissors", "knife", "saw", "person"],
            "QUALITY_CONTROL": ["laptop", "person", "phone"],
            "SETUP_PHASE": ["person", "laptop", "tools"]
        }
    
    def identify_affordances(self, objects: List[str]) -> Dict[str, List[str]]:
        """Identify what actions are possible with detected objects"""
        object_affordances = {}
        for obj in objects:
            if obj in self.affordances:
                object_affordances[obj] = self.affordances[obj]
            else:
                # Generic affordances for unknown objects
                object_affordances[obj] = ["handling", "moving", "using"]
        return object_affordances
    
    def find_object_combinations(self, objects: List[str]) -> List[Dict[str, Any]]:
        """Find meaningful combinations of objects that work together"""
        combinations = []
        
        # Person + Tool combinations
        if "person" in objects:
            tools = [obj for obj in objects if obj != "person"]
            for tool in tools:
                combinations.append({
                    "objects": ["person", tool],
                    "interaction": f"Person using {tool}",
                    "confidence": 0.9
                })
        
        # Tool combinations
        tool_pairs = [
            (["screwdriver", "wrench"], "Assembly work"),
            (["hammer", "drill"], "Construction work"),
            (["scissors", "knife"], "Cutting operations"),
            (["laptop", "phone"], "Digital documentation")
        ]
        
        for tool_pair, activity in tool_pairs:
            if all(tool in objects for tool in tool_pair):
                combinations.append({
                    "objects": tool_pair,
                    "interaction": activity,
                    "confidence": 0.8
                })
        
        return combinations
    
    def infer_task_phase(self, objects: List[str]) -> str:
        """Determine the current task phase based on objects"""
        scores = {}
        
        for phase, required_objects in self.task_patterns.items():
            score = 0
            for req_obj in required_objects:
                if req_obj in objects or any(req_obj in obj for obj in objects):
                    score += 1
            scores[phase] = score / len(required_objects)
        
        if not scores or max(scores.values()) == 0:
            return "GENERAL_WORK_PHASE"
        
        return max(scores, key=scores.get)
    
    def detect_anomalies(self, objects: List[str]) -> List[str]:
        """Detect potential safety or workflow anomalies"""
        anomalies = []
        
        # Safety checks
        dangerous_tools = ["drill", "hammer", "knife", "saw"]
        safety_equipment = ["gloves", "safety glasses", "mask", "hard hat"]
        
        has_dangerous = any(tool in objects for tool in dangerous_tools)
        has_safety = any(safety in ' '.join(objects) for safety in safety_equipment)
        
        if has_dangerous and not has_safety:
            anomalies.append("Dangerous tools detected without safety equipment")
        
        # Workflow anomalies
        if "laptop" in objects and "drill" in objects:
            anomalies.append("Electronic device near power tools - potential interference")
        
        return anomalies
    
    def generate_guidance(self, objects: List[str]) -> Dict[str, Any]:
        """Generate comprehensive guidance based on detected objects"""
        if not objects:
            return {
                "summary": "No objects detected. Please ensure good lighting and clear view of workspace.",
                "task_phase": "UNKNOWN_PHASE",
                "affordances": {},
                "object_combinations": [],
                "anomalies": [],
                "next_steps": "Position objects clearly in view for analysis."
            }
        
        affordances = self.identify_affordances(objects)
        combinations = self.find_object_combinations(objects)
        task_phase = self.infer_task_phase(objects)
        anomalies = self.detect_anomalies(objects)
        
        # Generate contextual summary
        if "person" in objects:
            summary = f"Worker detected with {len(objects)-1} objects. Current phase: {task_phase}."
        else:
            summary = f"{len(objects)} objects detected in workspace. Phase: {task_phase}."
        
        # Generate next steps
        if task_phase == "ASSEMBLY_PHASE":
            next_steps = "1. Verify component alignment 2. Check torque specifications 3. Follow assembly sequence"
        elif task_phase == "MAINTENANCE_PHASE":
            next_steps = "1. Power down equipment 2. Follow lockout procedures 3. Inspect components"
        elif task_phase == "QUALITY_CONTROL":
            next_steps = "1. Document measurements 2. Compare to specifications 3. Record findings"
        else:
            next_steps = "Continue with standard operating procedures for current task"
        
        return {
            "summary": summary,
            "task_phase": task_phase,
            "affordances": affordances,
            "object_combinations": combinations,
            "anomalies": anomalies,
            "next_steps": next_steps
        }