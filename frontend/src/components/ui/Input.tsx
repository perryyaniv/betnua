import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, className = '', ...props }, ref) => (
  <div>
    {label && (
      <label className="label" htmlFor={id}>
        {label}
      </label>
    )}
    <input ref={ref} id={id} className={`input ${className}`} {...props} />
  </div>
));

Input.displayName = 'Input';
export default Input;
