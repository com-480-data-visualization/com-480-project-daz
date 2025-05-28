(function(){
    // Quiz data from real datasets
    const quizData = [
      {
        question: 'Which core component is included in the UN’s Human Development Index?',
        options: ['Literacy rate', 'Life expectancy at birth', 'Population density', 'Number of Nobel laureates'],
        answer: 'Life expectancy at birth'
      },
      {
        question: 'Which of these is NOT one of the six key variables used in the World Happiness Report?',
        options: ['Freedom to make life choices', 'GDP per capita', 'Military strength', 'Healthy life expectancy'],
        answer: 'Military strength'
      },
      {
        question: 'Which country had the highest average HDI between 2010 and 2020?',
        options: ['Canada', 'Russia', 'China', 'Japan'],
        answer: 'Canada'
      },
      {
        question: 'Which country had the highest Human Development Index in 2022?',
        options: ['Switzerland', 'Denmark', 'Ireland', 'Sweden'],
        answer: 'Switzerland'
      },
      {
        question: 'Which region had the lowest happiness score from 2015 to 2020?',
        options: ['Sub-Saharan Africa', 'Western Europe', 'Southeast Asia', 'Middle East'],
        answer: 'Sub-Saharan Africa'
      },
      {
        question: 'Which region showed a consistent increase in its Health Care Index from 2015 to 2019?',
        options: ['East Asia', 'Western Europe', 'North America', 'South Asia'],
        answer: 'East Asia'
      },
      {
        question: 'From 2015 to 2022, which country consistently ranked in the top 3 of the Gender Inequality Index?',
        options: ['Yemen', 'Nigeria', 'Haiti', 'Benin'],
        answer: 'Yemen'
      },
      {
        question: 'True or false: From 2015–20, Western Europe’s Happiness Score never dipped below 7.',
        options: ['True', 'False'],
        answer: 'False'
      },
      {
        question: 'Between 2015 and 2020, the region with the lowest life expectancy was ______.',
        options: ['Sub-Saharan Africa', 'South Asia', 'East Asia', 'North America'],
        answer: 'Sub-Saharan Africa'
      },
      {
        question: 'The highest pollution index belongs to ___ in 2022.',
        options: ['Lebanon', 'Egypt', 'Nigeria', 'Peru'],
        answer: 'Lebanon'
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