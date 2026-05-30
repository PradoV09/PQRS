import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'MatchPasswords', async: false })
export class MatchPasswordsConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const dto = args.object as any;
    return dto.password === dto.confirmPassword;
  }
  defaultMessage() {
    return 'Las contraseñas no coinciden.';
  }
}

export function MatchPasswords(validationOptions?: ValidationOptions) {
  return function (target: object) {
    registerDecorator({
      name: 'matchPasswords',
      target: target.constructor,
      propertyName: 'confirmPassword',
      options: validationOptions,
      validator: MatchPasswordsConstraint,
    });
  };
}

@MatchPasswords({ message: 'Las contraseñas no coinciden.' })
export class RegisterDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/, {
    message: 'El nombre solo puede contener letras, espacios, apóstrofes y guiones.',
  })
  nombre: string;

  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  @MaxLength(255, { message: 'El correo no puede superar 255 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]+$/,
    {
      message:
        'La contraseña debe tener al menos una mayúscula, una minúscula, ' +
        'un número y un carácter especial (@$!%*?&._-).',
    },
  )
  password: string;

  @IsString({ message: 'La confirmación de contraseña es obligatoria.' })
  @IsNotEmpty({ message: 'La confirmación de contraseña es obligatoria.' })
  confirmPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede superar 20 caracteres.' })
  @Matches(/^[+\d\s()-]{7,20}$/, {
    message: 'El teléfono no tiene un formato válido.',
  })
  telefono?: string;
}
