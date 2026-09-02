document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('prediction-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = document.getElementById('spinner');
  
  const errorSummary = document.getElementById('error-summary');
  const errorMessage = document.getElementById('error-message');
  
  const placeholderState = document.getElementById('placeholder-state');
  const resultState = document.getElementById('result-state');
  const scoreValue = document.getElementById('score-value');
  const meterFill = document.getElementById('meter-fill');
  const insightBox = document.getElementById('insight-box');
  const insightTitle = document.getElementById('insight-title');
  const insightDesc = document.getElementById('insight-desc');

  const API_URL = 'http://127.0.0.1:8000/predict';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();

    // Collect data
    const formData = new FormData(form);
    const data = {
      Age: parseInt(formData.get('Age')),
      Gender: formData.get('Gender'),
      Country: formData.get('Country'),
      Academic_Level: formData.get('Academic_Level'),
      Most_Used_Platform: formData.get('Most_Used_Platform'),
      Purpose_Of_Use: formData.get('Purpose_Of_Use'),
      Avg_Daily_Usage_Hours: parseFloat(formData.get('Avg_Daily_Usage_Hours')),
      Daily_Unlocks: parseInt(formData.get('Daily_Unlocks')),
      Study_Hours: parseFloat(formData.get('Study_Hours')),
      Physical_Activity_Hours: parseFloat(formData.get('Physical_Activity_Hours')),
      Sleep_Hours_Per_Night: parseFloat(formData.get('Sleep_Hours_Per_Night')),
      Stress_Level: formData.get('Stress_Level')
    };

    // Client-side validation check
    const isValid = validateClientSide(data);
    if (!isValid) return;

    // Show loading state
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(parseFastAPIError(errData));
      }

      const result = await response.json();
      renderResult(result.predicted_mental_health_score);
    } catch (err) {
      showError(err.message || 'Unable to reach the prediction service. Ensure Uvicorn server is running.');
    } finally {
      setLoading(false);
    }
  });

  function validateClientSide(data) {
    let valid = true;
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === '' || Number.isNaN(value)) {
        showFieldError(key, 'This field is required');
        valid = false;
      }
    }

    if (data.Age < 10 || data.Age > 100) {
      showFieldError('Age', 'Age must be between 10 and 100');
      valid = false;
    }

    const hourlyFields = ['Avg_Daily_Usage_Hours', 'Study_Hours', 'Physical_Activity_Hours', 'Sleep_Hours_Per_Night'];
    hourlyFields.forEach(field => {
      if (data[field] < 0 || data[field] > 24) {
        showFieldError(field, 'Hours must be between 0 and 24');
        valid = false;
      }
    });

    if (data.Daily_Unlocks < 0) {
      showFieldError('Daily_Unlocks', 'Unlocks must be 0 or greater');
      valid = false;
    }

    return valid;
  }

  function showFieldError(fieldId, msg) {
    const inputElem = document.getElementById(fieldId);
    const errSpan = document.getElementById(`err-${fieldId}`);
    if (inputElem) inputElem.classList.add('invalid');
    if (errSpan) errSpan.textContent = msg;
  }

  function clearErrors() {
    errorSummary.classList.add('hidden');
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('input, select').forEach(el => el.classList.remove('invalid'));
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorSummary.classList.remove('hidden');
  }

  function parseFastAPIError(errData) {
    if (errData.detail && Array.isArray(errData.detail)) {
      return errData.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
    }
    return errData.detail || 'An unexpected server error occurred.';
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      btnText.textContent = 'Calculating Score...';
      spinner.classList.remove('hidden');
    } else {
      btnText.textContent = 'Generate Assessment';
      spinner.classList.add('hidden');
    }
  }

  function renderResult(score) {
    placeholderState.classList.add('hidden');
    resultState.classList.remove('hidden');

    scoreValue.textContent = score;

    // Normalize percentage (Assuming typical risk/score spectrum spans 0 to 100 or 0 to 10)
    let percentage = score;
    if (score <= 10) percentage = score * 10; // Auto-scale 0-10 range up to percentage
    percentage = Math.min(Math.max(percentage, 0), 100);

    meterFill.style.width = `${percentage}%`;

    // Dynamic visual feedback using Palette Theory
    if (percentage <= 35) {
      // Optimal / Low Risk (Mint Green)
      scoreValue.style.color = 'var(--accent-mint)';
      meterFill.style.backgroundColor = 'var(--accent-mint)';
      insightBox.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      insightTitle.textContent = 'Optimal Balance Identified';
      insightTitle.style.color = 'var(--accent-mint)';
      insightDesc.textContent = 'Indicators point toward low stress levels and stable daily habits.';
    } else if (percentage <= 70) {
      // Moderate / Alert (Amber/Yellow)
      scoreValue.style.color = 'var(--accent-amber)';
      meterFill.style.backgroundColor = 'var(--accent-amber)';
      insightBox.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      insightTitle.textContent = 'Moderate Stress Risk';
      insightTitle.style.color = 'var(--accent-amber)';
      insightDesc.textContent = 'Screen time, unlock frequency, or sleep metrics suggest moderate mental strain.';
    } else {
      // High Risk (Coral/Rose Red)
      scoreValue.style.color = 'var(--accent-rose)';
      meterFill.style.backgroundColor = 'var(--accent-rose)';
      insightBox.style.borderColor = 'rgba(244, 63, 94, 0.4)';
      insightTitle.textContent = 'High Burden Indicator';
      insightTitle.style.color = 'var(--accent-rose)';
      insightDesc.textContent = 'High workload combined with low physical activity or sleep indicates significant strain.';
    }
  }
});