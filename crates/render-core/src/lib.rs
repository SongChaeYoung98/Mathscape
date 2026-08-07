use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Camera3D {
    pub position: [f32; 3],
    pub target: [f32; 3],
    pub fov_degrees: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CameraKeyframe3D {
    pub time_seconds: f64,
    pub camera: Camera3D,
}

impl Default for Camera3D {
    fn default() -> Self {
        Self {
            position: [3.0, 2.0, 4.0],
            target: [0.0, 0.0, 0.0],
            fov_degrees: 45.0,
        }
    }
}
