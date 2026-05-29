import {
  IsString,
  IsEmail,
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

// Class-level custom validator constraint to check if passwords match
@ValidatorConstraint({ name: 'MatchPasswords', async: false })
export class MatchPasswordsConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const dto = args.object as any;
    return dto.password === dto.confirmPassword;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Las contraseñas no coinciden.';
  }
}

// Class decorator wrapper for the constraint
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
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  nombre: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()#_+\-=\[\]{}|;:',.<>?/\\~^]).{8,}$/,
    {
      message:
        'La contraseña debe incluir al menos una letra mayúscula, una letra minúscula, un número y un carácter especial.',
    },
  )
  password: string;

  @IsString({ message: 'La confirmación de la contraseña es obligatoria.' })
  confirmPassword: string;
}
