import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { z } from 'zod'

/** Responde só com caminho e código dos erros: o valor recusado pode ser dado pessoal. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const parsed = this.schema.safeParse(value)
    if (parsed.success) return parsed.data
    throw new BadRequestException({
      code: 'validation',
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code })),
    })
  }
}
