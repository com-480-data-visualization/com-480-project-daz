(function(){
    // Quiz data from real datasets
    const quizData = [
      {
        question: 'Which country had the highest Human Development Index (HDI) in 2022?',
        options: ['Switzerland','Norway','Iceland','Denmark'],
        answer: 'Switzerland'
      },
      {
        question: 'Which country had the lowest Human Development Index (HDI) in 2023?',
        options: ['Somalia','South Sudan','Central African Republic','South Africa'],
        answer: 'South Sudan'
      },
      {
        question: 'Which country ranks first in the Quality of Life Index 2025?',
        options: ['Luxembourg','Netherlands','Denmark','Oman'],
        answer: 'Luxembourg'
      },
      {
        question: 'Which country ranks fourth in the Quality of Life Index 2025?',
        options: ['Denmark','Switzerland','Oman','Netherlands'],
        answer: 'Oman'
      },
      {
        question: 'Which country topped the World Happiness Report rankings in 2025?',
        options: ['Denmark','Iceland','Finland','Sweden'],
        answer: 'Finland'
      },
      {
        question: 'Which country was ranked 5th in the 2025 World Happiness Report?',
        options: ['Sweden','Israel','Netherlands','Norway'],
        answer: 'Israel'
      }
    ];

    let current = 0, score = 0;
    const quiz = document.getElementById('quiz');
    const feedback = document.getElementById('feedback');
    const questionEl = document.getElementById('question');
    const optionsEl = document.getElementById('options');
    const nextBtn = document.getElementById('nextBtn');

    function loadQuestion() {
      const q = quizData[current];
      questionEl.textContent = q.question;
      optionsEl.innerHTML = '';
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.setAttribute('data-answer', opt);
        btn.addEventListener('click', selectAnswer);
        optionsEl.appendChild(btn);
      });
    }

    function selectAnswer(e) {
      const userAns = e.target.getAttribute('data-answer');
      const correct = quizData[current].answer;
      quiz.classList.remove('correct','wrong');
      feedback.textContent = '';
      disableOptions(true);

      if (userAns === correct) {
        score++;
        quiz.classList.add('correct');
        feedback.textContent = 'Correct!';
      } else {
        quiz.classList.add('wrong');
        feedback.textContent = 'Wrong!';
      }
      nextBtn.style.display = 'block';
    }

    function disableOptions(disable) {
      optionsEl.querySelectorAll('button').forEach(btn => btn.disabled = disable);
    }

    nextBtn.addEventListener('click', () => {
      quiz.classList.remove('correct','wrong');
      feedback.textContent = '';
      nextBtn.style.display = 'none';
      disableOptions(false);
      current++;
      if (current < quizData.length) {
        loadQuestion();
      } else {
        showResults();
      }
    });

    function showResults() {
      questionEl.textContent = `Quiz completed! Your score: ${score} / ${quizData.length}`;
      optionsEl.innerHTML = '';
      nextBtn.style.display = 'none';
    }

    loadQuestion();
  })();