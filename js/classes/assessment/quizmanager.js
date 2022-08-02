import { Question, Assessment } from "./assessment.js";

class QuestionLogInfo {
    constructor(q) {
        this.start_time = new Date();
        this.question = q;
        this.current_question = 0;
    }

    complete(extra_info) {
        this.correct = this.question.correct;
        this.num_attempts = this.question.num_attempts;
        this.end_time = new Date();
        this.elapsed = (this.end_time.getTime() - this.start_time.getTime()) * 1000;
        this.extra_info = extra_info;
    }
}

export default class QuizManager {

    constructor() {
        this.is_assessing = false;

        this.q_log_info = [];
    }

    start(assessment) {

        if (!this.assessment)
            this.setAssessment(assessment);

        if (!this.assessment || !this.assessment.is_assessment)
            return;

        this.assessment.restart();

        this.is_assessing = true;
        this.current_question = 0;
        this.start_time = new Date();
        this.end_time = null;
    }

    update() {
        if (this.onUpdateQuestion)
            this.onUpdateQuestion(this.current_question, this.current_log_info.question);
    }

    nextQuestion() {
        if (!this.is_assessing)
            return null;

        let next = this.assessment.nextQuestion();

        // Check if we are finished
        if (this.assessment.current_question_id == -1) {
            this.stop();
            return next;
        }

        // create a new log info
        this.current_log_info = new QuestionLogInfo(next);
        this.q_log_info.push(this.current_log_info);
        this.current_question++;
    }

    answer(ans, extra_info) {

        if (!this.is_assessing)
            return false;

        // answer the question
        let answered = this.assessment.answer(ans);

        if (!answered)
            return false;

        // report on the question
        if (!extra_info)
            extra_info = {};

        this.current_log_info.complete(extra_info);

        return true;
    }

    stop() {
        this.is_assessing = false;
        this.end_time = new Date();
    }

    createQuestion(question, answer, options) {

        return new Question(question, answer, options);

    }

    setQuestions(questions) {
        this.questions = questions;
    }

    setAssessment(assessment) {
        this.assessment = assessment;
    }

    createAssessment(parameters) {

        return new Assessment(parameters);
    }

    createAssessmentFromQuestions(parameters) {

        if (!parameters)
            parameters = {};

        parameters.questions = this.questions;

        return this.createAssessment(parameters);
    }
}