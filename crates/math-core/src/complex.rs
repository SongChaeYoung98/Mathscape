use num_complex::Complex64;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ComplexSample {
    pub re: f64,
    pub im: f64,
    pub magnitude: f64,
    pub phase: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DomainColorSample {
    pub x: f64,
    pub y: f64,
    pub value: ComplexSample,
    pub hue: f64,
    pub brightness: f64,
}

impl From<Complex64> for ComplexSample {
    fn from(value: Complex64) -> Self {
        Self {
            re: value.re,
            im: value.im,
            magnitude: value.norm(),
            phase: value.arg(),
        }
    }
}

pub fn domain_color_sample(x: f64, y: f64, value: Complex64) -> DomainColorSample {
    let sample = ComplexSample::from(value);
    let hue = sample.phase / std::f64::consts::TAU + 0.5;
    let brightness = (0.34 + sample.magnitude.ln_1p() * 0.26).clamp(0.08, 1.0);

    DomainColorSample {
        x,
        y,
        value: sample,
        hue,
        brightness,
    }
}

pub fn zeta_eta_approx(re: f64, im: f64, terms: usize) -> Complex64 {
    let s = Complex64::new(re, im);
    let mut eta = Complex64::new(0.0, 0.0);

    for n in 1..=terms.max(1) {
        let sign = if n % 2 == 0 { -1.0 } else { 1.0 };
        let log_n = (n as f64).ln();
        eta += sign * (-s * log_n).exp();
    }

    let denominator =
        Complex64::new(1.0, 0.0) - ((Complex64::new(1.0, 0.0) - s) * std::f64::consts::LN_2).exp();
    if denominator.norm_sqr() <= f64::EPSILON {
        eta
    } else {
        eta / denominator
    }
}
