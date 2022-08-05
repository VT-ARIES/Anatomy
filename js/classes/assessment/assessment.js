class Question {
    constructor(question, correct_answer, parameters) {
        
        if (!parameters)
            parameters = {};

        this.options = parameters.options ? parameters.options : [correct_answer];
        this.max_num_attempts = parameters.max_num_attempts ? parameters.max_num_attempts : 1;

        this.question = question;
        this.correct_answer = correct_answer;

        this.answered = false;
        this.num_attempts = 0;
        this.correct = false;
    }

    answer(ans) {
        this.correct = ans == this.correct_answer;
        this.num_attempts++;

        if (this.correct || this.num_attempts >= this.max_num_attempts)
            this.answered = true;
    }
}


class Assessment {

    constructor(parameters) {

        this.is_assessment = true;

        this.options = {};
        this.options.score = parameters.options.score ? parameters.options.score : false;
        this.options.shuffle_questions = parameters.options.shuffle_questions ? parameters.options.shuffle_questions : false;

        this.questions = parameters.questions ? parameters.questions : [];

        this.num_questions = parameters.questions ? parameters.questions.length : 0;
        this.end_of_assessment_text = parameters.end_of_assessment_text ? parameters.end_of_assessment_text : "Assessment Completed";

        this.current_question_id = 1;
        this.num_questions_done = 0;

        if (this.options.score) {
            this.num_questions_correct = 0;
            this.num_questions_incorrect = 0;

            this.min_questions_to_pass = parameters.min_questions_to_pass ? parameters.min_questions_to_pass : 0;
            this.pass_text = parameters.pass_text ? parameters.pass_text : this.end_of_assessment_text;
            this.fail_text = parameters.fail_text ? parameters.fail_text : this.end_of_assessment_text;
        }

    }

    restart() {

        this.questions.forEach(q=>{
            q.answered = false;
            q.correct = false;
            q.num_attempts = 0;
        });

        this.num_questions_done = 0;
        this.current_question_id = 0;

        if (this.options.score) {
            this.num_questions_correct = 0;
            this.num_questions_incorrect = 0;
        }
    }

    nextQuestion() {

        // Check if we are complete
        if (this.num_questions_done == this.num_questions) {

            this.current_question_id = -1;
            // Check if we are supposed to score
            if (this.options.score) {

                if (this.num_questions_correct >= this.min_questions_to_pass) {
                    return new Question(this.pass_text, "")
                }
                else {
                    return new Question(this.fail_text, "")
                }
            }
            else {
                // If we have end of assessment text, send it
                return new Question(this.end_of_assessment_text, "");
            }
        }

        // Check if we've used all attempts
        let next_q_id = this.current_question_id;
        let current_q = this.questions[next_q_id];
        if (!current_q.answered && current_q.num_attempts >= 1)
            return this.questions[next_q_id];

        // Otherwise shuffle or linearly go
        if (this.options.shuffle_questions) {
            while (true) {
                next_q_id = Math.floor(this.num_questions * Math.random())
                let q = this.questions[next_q_id];
                if (!q.answered) {
                    this.current_question_id = next_q_id;
                    return q;
                }
            }
        }
        
        // Otherwise, go to the next question
        while (true) {
            next_q_id = this.current_question_id + 1;
            this.current_question_id++;
            let q = this.questions[next_q_id];
            if (!q.answered) {
                this.current_question_id =next_q_id;
                return q;
            }
        }
    }

    answer(ans) {

        if (this.current_question_id == -1 || this.num_questions_done >= this.num_questions) {
            return false;
        }

        let q = this.questions[this.current_question_id];
        q.answer(ans);

        if (this.options.score) {
            
            if (q.correct)
                this.num_questions_correct++;
            else
                this.num_questions_incorrect++;
        }

        // Check we've used all attempts
        if (q.answered)
            this.num_questions_done++;

        return q.answered;
    }


}

export {Question, Assessment};