import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, id, className = '', children, ...props }, ref) => (
  <div>
    {label && (
      <label className="label" htmlFor={id}>
        {label}
      </label>
    )}
    <select ref={ref} id={id} className={`input ${className}`} {...props}>
      {children}
    </select>
  </div>
));

Select.displayName = 'Select';
export default Select;
