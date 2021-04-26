// Variables - Getting the text to udpate
var categoryLabel = document.getElementById('categoryLabel');
var questionText = document.getElementById('questionText');
var optionA = document.getElementById('optionA');
var optionB = document.getElementById('optionB');
var optionC = document.getElementById('optionC');
var optionD = document.getElementById('optionD');
var categoryImage = document.getElementById('categoryImage');
var questionValue = document.getElementById('questionValue');

// Game objects
var scoreLabel = document.querySelector('.scoreLabel');

// Game variables
var score = 0;
var selectedPoints = 0;
var selectedQuestion;

// Show questions
function showQuestion(category, question) {
    // Populate question data
	getQuestionData(category, question);
    // Open modal
    $('#questionModal').modal();
}

// Generate question data
function getQuestionData(category, question){
    // Update question
    questionValue.innerHTML = "$" + 100*question;
    categoryLabel.innerHTML = questions["category" + category].categoryLabel; 
    categoryImage.src = questions["category" + category].categoryImage;
    questionText.innerHTML = questions["category" + category]["question" + question].questionText;
    // Update answers
	optionA.innerHTML = questions["category" + category]["question" + question].optionA;
	optionB.innerHTML = questions["category" + category]["question" + question].optionB;
	optionC.innerHTML = questions["category" + category]["question" + question].optionC;
    optionD.innerHTML = questions["category" + category]["question" + question].optionD;
    
    // set the correct option button
    updateCurrentCorrect(questions["category" + category]["question" + question].correctResponse);
    // Update current selected dollar amount
    selectedPoints = event.target.innerHTML;
    selectedQuestion = event.target;
}

// Add .correct class for question
function updateCurrentCorrect(correctResponse){

    switch(correctResponse)
    {
        case "A":
            optionA.classList.add('correct');
            break;
        case "B":
            optionB.classList.add('correct');
            break;
        case "C":
            optionC.classList.add('correct');
            break;
        case "D":
            optionD.classList.add('correct');
            break;
    }
}

// Disable the button after selected
function disableButton(e){
	e.style.cursor = 'auto';
	e.classList.remove('question');
	e.classList.add('questionAnswered');
    e.onclick = '';
    e.innerHTML = '';
}

// Check question answer
function submitQuestion(){
    // Disable the question for next time
    disableButton(selectedQuestion);

	if (event.target.classList.contains('correct')) {
        event.target.classList.remove('btn-primary');
        event.target.classList.add('btn-success');
        updateScore(parseInt(selectedPoints.substring(1)));
        setTimeout(function(target) {
            $('#questionModal').modal('hide');
            target.classList.remove('btn-success');
            target.classList.add('btn-primary');
        }, 1000, event.target);

	} else{
        event.target.classList.remove('btn-primary');
        event.target.classList.add('btn-danger');
        updateScore(-parseInt(selectedPoints.substring(1)));
        setTimeout(function(target) {
            $('#questionModal').modal('hide');
            target.classList.remove('btn-danger');
            target.classList.add('btn-primary');
        }, 1000, event.target);
    }
}

// Update score
function updateScore(e){
    score = score + e;
    if(score >= 0)
        scoreLabel.innerHTML = "SCORE: $" + score;
    else
        scoreLabel.innerHTML = "SCORE: -$" + Math.abs(score);    
}

// Remove all correct labels
$("#questionModal").on("hidden.bs.modal", function () {
    optionA.classList.remove('correct');
    optionB.classList.remove('correct');
    optionC.classList.remove('correct');
    optionD.classList.remove('correct');
});