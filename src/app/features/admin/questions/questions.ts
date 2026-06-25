import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiFailure } from '../../../core/models/api-response.model';
import { AssessmentDetail } from '../../../core/models/assessment.model';
import { QuestionRequest, QuestionResponse, QuestionTypeValue } from '../../../core/models/question.model';
import { AssessmentService } from '../../../core/services/assessment.service';
import { QuestionService } from '../../../core/services/question.service';

interface Banner {
  kind: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-questions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './questions.html',
})
export class Questions {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly assessmentService = inject(AssessmentService);
  private readonly questionService = inject(QuestionService);

  readonly assessmentId = Number(this.route.snapshot.paramMap.get('id'));

  readonly assessment = signal<AssessmentDetail | null>(null);
  readonly questions = signal<QuestionResponse[]>([]);
  readonly loadingList = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formErrors = signal<string[]>([]);

  readonly busyId = signal<number | null>(null);
  readonly banner = signal<Banner | null>(null);

  readonly form = this.fb.group({
    questionText: this.fb.control('', [Validators.required]),
    questionType: this.fb.control<QuestionTypeValue>('MCQ', [Validators.required]),
    maxMarks: this.fb.control(10, [Validators.required, Validators.min(1), Validators.max(100)]),
    modelAnswer: this.fb.control(''),
    options: this.fb.array([this.fb.control(''), this.fb.control('')]),
    correctOptionIndex: this.fb.control(0, { nonNullable: true }),
  });

  get optionControls() {
    return (this.form.get('options') as FormArray).controls;
  }

  constructor() {
    this.loadAssessment();
    this.loadQuestions();
  }

  loadAssessment(): void {
    this.assessmentService.getById(this.assessmentId).subscribe({
      next: (a) => this.assessment.set(a),
      error: () => this.assessment.set(null), // non-fatal — the heading just omits the title
    });
  }

  loadQuestions(): void {
    this.loadingList.set(true);
    this.loadError.set(null);
    this.questionService.getByAssessmentId(this.assessmentId).subscribe({
      next: (list) => {
        this.questions.set(list);
        this.loadingList.set(false);
      },
      error: (failure: ApiFailure) => {
        this.loadError.set(failure.errorMessages.join(' '));
        this.loadingList.set(false);
      },
    });
  }

  addOption(): void {
    (this.form.get('options') as FormArray).push(this.fb.control(''));
  }

  removeOption(index: number): void {
    const arr = this.form.get('options') as FormArray;
    if (arr.length <= 2) return; // backend requires at least 2 options for MCQ

    arr.removeAt(index);

    const current = this.form.controls.correctOptionIndex.value;
    if (current === index) {
      this.form.controls.correctOptionIndex.setValue(0);
    } else if (current > index) {
      this.form.controls.correctOptionIndex.setValue(current - 1);
    }
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.formErrors.set([]);
    this.resetFormForType('MCQ');
    this.showForm.set(true);
  }

  openEditForm(q: QuestionResponse): void {
    this.editingId.set(q.id);
    this.formErrors.set([]);

    const optionsArray = this.form.get('options') as FormArray;
    optionsArray.clear();

    if (q.questionType === 'MCQ' && q.options.length > 0) {
      q.options.forEach((o) => optionsArray.push(this.fb.control(o.optionText)));
      const correctIndex = q.options.findIndex((o) => o.isCorrect);
      this.form.patchValue({
        questionText: q.questionText,
        questionType: 'MCQ',
        maxMarks: q.maxMarks,
        modelAnswer: '',
        correctOptionIndex: correctIndex >= 0 ? correctIndex : 0,
      });
    } else {
      optionsArray.push(this.fb.control(''));
      optionsArray.push(this.fb.control(''));
      this.form.patchValue({
        questionText: q.questionText,
        questionType: 'Descriptive',
        maxMarks: q.maxMarks,
        modelAnswer: q.modelAnswer ?? '',
        correctOptionIndex: 0,
      });
    }

    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  submit(): void {
    this.formErrors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { questionText, questionType, maxMarks, modelAnswer, options, correctOptionIndex } =
      this.form.getRawValue();

    if (questionType === 'MCQ') {
      const filled = (options as string[]).map((o) => o.trim()).filter((o) => o.length > 0);
      if (filled.length < 2) {
        this.formErrors.set(['MCQ questions require at least 2 non-empty options.']);
        return;
      }
    } else if (!modelAnswer || !modelAnswer.trim()) {
      this.formErrors.set(['Descriptive questions require a model answer.']);
      return;
    }

    const req: QuestionRequest = {
      questionText: questionText!,
      questionType: questionType!,
      maxMarks: maxMarks!,
      assessmentId: this.assessmentId,
      modelAnswer: questionType === 'Descriptive' ? modelAnswer : null,
      options: questionType === 'MCQ' ? (options as string[]) : null,
      correctOptionIndex: questionType === 'MCQ' ? correctOptionIndex : null,
    };

    this.saving.set(true);
    const editingId = this.editingId();
    const op = editingId ? this.questionService.update(editingId, req) : this.questionService.create(req);

    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.banner.set({ kind: 'success', text: editingId ? 'Question updated.' : 'Question added.' });
        this.loadQuestions();
        this.loadAssessment(); // the assessment's question count may have changed
      },
      error: (failure: ApiFailure) => {
        this.saving.set(false);
        this.formErrors.set(failure.errorMessages);
      },
    });
  }

  remove(q: QuestionResponse): void {
    if (!confirm('Delete this question? This cannot be undone.')) {
      return;
    }

    this.busyId.set(q.id);
    this.questionService.delete(q.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.banner.set({ kind: 'success', text: 'Question deleted.' });
        this.loadQuestions();
        this.loadAssessment();
      },
      error: (failure: ApiFailure) => {
        this.busyId.set(null);
        this.banner.set({ kind: 'error', text: failure.errorMessages.join(' ') });
      },
    });
  }

  dismissBanner(): void {
    this.banner.set(null);
  }

  private resetFormForType(type: QuestionTypeValue): void {
    const optionsArray = this.form.get('options') as FormArray;
    optionsArray.clear();
    optionsArray.push(this.fb.control(''));
    optionsArray.push(this.fb.control(''));
    this.form.reset({
      questionText: '',
      questionType: type,
      maxMarks: 10,
      modelAnswer: '',
      correctOptionIndex: 0,
    });
  }
}