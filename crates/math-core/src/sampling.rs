use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SamplePoint {
    pub x: f64,
    pub y: f64,
}

pub fn sample_sine(
    amplitude: f64,
    frequency: f64,
    phase: f64,
    min_x: f64,
    max_x: f64,
    samples: usize,
) -> Vec<SamplePoint> {
    let count = samples.max(2);
    let step = (max_x - min_x) / (count - 1) as f64;

    (0..count)
        .map(|index| {
            let x = min_x + step * index as f64;
            let y = amplitude * (frequency * x + phase).sin();
            SamplePoint { x, y }
        })
        .filter(|point| point.y.is_finite())
        .collect()
}
