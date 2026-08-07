use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Expression {
    Constant(f64),
    Variable(String),
    Add(Box<Expression>, Box<Expression>),
    Multiply(Box<Expression>, Box<Expression>),
    Sin(Box<Expression>),
    Cos(Box<Expression>),
}

impl Expression {
    pub fn variable(name: impl Into<String>) -> Self {
        Self::Variable(name.into())
    }
}
