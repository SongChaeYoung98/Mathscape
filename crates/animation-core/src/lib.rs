use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum Easing {
    Linear,
    EaseInOut,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Keyframe<T> {
    pub time_seconds: f64,
    pub value: T,
    pub easing: Easing,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ParameterTrack {
    pub amplitude: f64,
    pub frequency: f64,
    pub phase: f64,
}

pub fn interpolate_parameter_track(
    previous: Keyframe<ParameterTrack>,
    next: Keyframe<ParameterTrack>,
    time_seconds: f64,
) -> ParameterTrack {
    let span = (next.time_seconds - previous.time_seconds).max(f64::EPSILON);
    let raw_t = ((time_seconds - previous.time_seconds) / span).clamp(0.0, 1.0);
    let t = match next.easing {
        Easing::Linear => raw_t,
        Easing::EaseInOut => {
            if raw_t < 0.5 {
                2.0 * raw_t * raw_t
            } else {
                1.0 - (-2.0 * raw_t + 2.0).powi(2) / 2.0
            }
        }
    };

    ParameterTrack {
        amplitude: lerp(previous.value.amplitude, next.value.amplitude, t),
        frequency: lerp(previous.value.frequency, next.value.frequency, t),
        phase: lerp(previous.value.phase, next.value.phase, t),
    }
}

fn lerp(start: f64, end: f64, t: f64) -> f64 {
    start + (end - start) * t
}
