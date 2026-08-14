import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../../../api/client';
import { UserPlus, UserCheck, Clock, Key, CheckCircle, Copy, AlertCircle, X, Users, PhoneCall, Check, Eye, EyeOff, Calculator } from 'lucide-react';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: number | null;
  onSaved: () => void;
}

interface Option {
  id: number;
  name: string;
}

interface FieldErrors {
  employeeCode?: string;
  name?: string;
  email?: string;
  phone?: string;
  fatherName?: string;
  motherName?: string;
  emergencyContact1?: string;
  emergencyContact2?: string;
  password?: string;
  departmentId?: string;
  designationId?: string;
  dateOfJoining?: string;
  reportingPersonId?: string;
  shiftStart?: string;
  shiftEnd?: string;
  workLocation?: string;
  employmentType?: string;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', label: '+91 (India)' },
  { code: '+1', country: 'US', label: '+1 (USA/Canada)' },
  { code: '+44', country: 'UK', label: '+44 (UK)' },
  { code: '+61', country: 'AU', label: '+61 (Australia)' },
  { code: '+971', country: 'AE', label: '+971 (UAE)' },
  { code: '+65', country: 'SG', label: '+65 (Singapore)' },
  { code: '+49', country: 'DE', label: '+49 (Germany)' },
];

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'reg' | 'rep' | 'work'>('reg');

  // Tab 1 Registration
  const [employeeCode, setEmployeeCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Phone state split: Country Code + Number
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneBody, setPhoneBody] = useState('');

  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  // Emergency Contact 1 split
  const [emg1CountryCode, setEmg1CountryCode] = useState('+91');
  const [emg1Body, setEmg1Body] = useState('');

  // Emergency Contact 2 split
  const [emg2CountryCode, setEmg2CountryCode] = useState('+91');
  const [emg2Body, setEmg2Body] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [designationId, setDesignationId] = useState<number | ''>('');
  const [designationFromDate, setDesignationFromDate] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [companyName, setCompanyName] = useState('RNT Technologies');
  const [pfNumber, setPfNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [esiNumber, setEsiNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Tab 2 Reporting Person
  const [reportingPersonId, setReportingPersonId] = useState<number | ''>('');

  // Tab 3 Work Details
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [workLocation, setWorkLocation] = useState('Office');
  const [employmentType, setEmploymentType] = useState('FullTime');

  // Step 3 / Payroll Details State
  const [annualCTC, setAnnualCTC] = useState<string>('');
  const [salaryConfigMode, setSalaryConfigMode] = useState<'ConfigureLater' | 'ConfigureNow'>('ConfigureLater');
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pfApplicable, setPfApplicable] = useState<boolean>(true);
  const [esiApplicable, setEsiApplicable] = useState<boolean>(false);
  const [ptApplicable, setPtApplicable] = useState<boolean>(false);
  const [tdsApplicable, setTdsApplicable] = useState<boolean>(false);

  // Detailed Earnings state when ConfigureNow is selected
  const [basicCalcType, setBasicCalcType] = useState<number>(0); // 0 = Percentage, 1 = FixedAmount
  const [basicPct, setBasicPct] = useState<string>('50');
  const [basicFixed, setBasicFixed] = useState<string>('');

  const [hraCalcType, setHraCalcType] = useState<number>(0); // 0 = Percentage, 1 = FixedAmount
  const [hraPct, setHraPct] = useState<string>('40');
  const [hraBase, setHraBase] = useState<number>(1); // 1 = BasicSalary, 0 = MonthlyCTC
  const [hraFixed, setHraFixed] = useState<string>('');

  const [convCalcType, setConvCalcType] = useState<number>(1); // 1 = FixedAmount
  const [convPct, setConvPct] = useState<string>('');
  const [convFixed, setConvFixed] = useState<string>('1600');

  const [medCalcType, setMedCalcType] = useState<number>(1); // 1 = FixedAmount
  const [medPct, setMedPct] = useState<string>('');
  const [medFixed, setMedFixed] = useState<string>('1250');

  const [specialCalcType, setSpecialCalcType] = useState<number>(2); // 2 = AutomaticBalance
  const [specialPct, setSpecialPct] = useState<string>('');
  const [specialFixed, setSpecialFixed] = useState<string>('');

  const [arrearsFixed, setArrearsFixed] = useState<string>('0');

  // Deductions state
  const [pfCalcType, setPfCalcType] = useState<number>(0); // 0 = Percentage
  const [pfPct, setPfPct] = useState<string>('12');
  const [pfBase, setPfBase] = useState<number>(1); // 1 = BasicSalary
  const [pfFixed, setPfFixed] = useState<string>('');

  const [esiCalcType, setEsiCalcType] = useState<number>(0); // 0 = Percentage
  const [esiPct, setEsiPct] = useState<string>('0.75');
  const [esiFixed, setEsiFixed] = useState<string>('');

  const [ptFixed, setPtFixed] = useState<string>('200');
  const [tdsFixed, setTdsFixed] = useState<string>('0');
  const [otherDeductionName, setOtherDeductionName] = useState<string>('Other Deduction');
  const [otherDeductionFixed, setOtherDeductionFixed] = useState<string>('0');

  // Non-negative input helper functions
  const handleNonNegativeChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setter('');
      return;
    }
    const sanitized = raw.replace(/-/g, '');
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num < 0) {
      setter('0');
    } else {
      setter(sanitized);
    }
  };

  const handleKeyDownNonNegative = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  // Derived Monthly CTC
  const monthlyCTC = React.useMemo(() => {
    const val = Math.max(0, parseFloat(annualCTC) || 0);
    return val <= 0 ? 0 : Math.round((val / 12) * 100) / 100;
  }, [annualCTC]);

  // Live preview breakdown
  const previewCalc = React.useMemo(() => {
    if (!monthlyCTC || monthlyCTC <= 0) {
      return { basic: 0, hra: 0, conv: 0, med: 0, special: 0, arrears: 0, gross: 0, pf: 0, esi: 0, pt: 0, tds: 0, other: 0, deductions: 0, netPay: 0, error: '' };
    }

    const safeBasicPct = Math.max(0, parseFloat(basicPct) || 0);
    const safeBasicFixed = Math.max(0, parseFloat(basicFixed) || 0);
    const safeHraPct = Math.max(0, parseFloat(hraPct) || 0);
    const safeHraFixed = Math.max(0, parseFloat(hraFixed) || 0);
    const safeConvPct = Math.max(0, parseFloat(convPct) || 0);
    const safeConvFixed = Math.max(0, parseFloat(convFixed) || 0);
    const safeMedPct = Math.max(0, parseFloat(medPct) || 0);
    const safeMedFixed = Math.max(0, parseFloat(medFixed) || 0);
    const safeSpecialPct = Math.max(0, parseFloat(specialPct) || 0);
    const safeSpecialFixed = Math.max(0, parseFloat(specialFixed) || 0);
    const safeArrearsFixed = Math.max(0, parseFloat(arrearsFixed) || 0);

    const safePfPct = Math.max(0, parseFloat(pfPct) || 0);
    const safePfFixed = Math.max(0, parseFloat(pfFixed) || 0);
    const safeEsiPct = Math.max(0, parseFloat(esiPct) || 0);
    const safeEsiFixed = Math.max(0, parseFloat(esiFixed) || 0);
    const safePtFixed = Math.max(0, parseFloat(ptFixed) || 0);
    const safeTdsFixed = Math.max(0, parseFloat(tdsFixed) || 0);
    const safeOtherFixed = Math.max(0, parseFloat(otherDeductionFixed) || 0);

    let b = basicCalcType === 0 ? Math.round(monthlyCTC * (safeBasicPct / 100) * 100) / 100 : safeBasicFixed;

    const hraBaseAmt = hraBase === 1 ? b : monthlyCTC;
    let h = hraCalcType === 0 ? Math.round(hraBaseAmt * (safeHraPct / 100) * 100) / 100 : safeHraFixed;

    let c = convCalcType === 0 ? Math.round(monthlyCTC * (safeConvPct / 100) * 100) / 100 : safeConvFixed;
    let m = medCalcType === 0 ? Math.round(monthlyCTC * (safeMedPct / 100) * 100) / 100 : safeMedFixed;
    let arr = safeArrearsFixed;

    let s = 0;
    let autoErr = '';
    if (specialCalcType === 2) {
      const explicitSum = b + h + c + m + arr;
      s = Math.round((monthlyCTC - explicitSum) * 100) / 100;
      if (s < 0) autoErr = `Earnings exceed Monthly CTC by ₹${Math.abs(s).toFixed(2)}`;
    } else if (specialCalcType === 0) {
      s = Math.round(monthlyCTC * (safeSpecialPct / 100) * 100) / 100;
    } else {
      s = safeSpecialFixed;
    }

    const gross = Math.round((b + h + c + m + s + arr) * 100) / 100;

    let pfAmt = 0;
    if (pfApplicable) {
      const pfBaseAmt = pfBase === 1 ? b : monthlyCTC;
      pfAmt = pfCalcType === 0 ? Math.round(pfBaseAmt * (safePfPct / 100) * 100) / 100 : safePfFixed;
    }

    let esiAmt = 0;
    if (esiApplicable) {
      esiAmt = esiCalcType === 0 ? Math.round(monthlyCTC * (safeEsiPct / 100) * 100) / 100 : safeEsiFixed;
    }

    let ptAmt = ptApplicable ? safePtFixed : 0;
    let tdsAmt = tdsApplicable ? safeTdsFixed : 0;
    let otherAmt = safeOtherFixed;

    const totalDeductions = Math.round((pfAmt + esiAmt + ptAmt + tdsAmt + otherAmt) * 100) / 100;
    const net = Math.max(0, Math.round((gross - totalDeductions) * 100) / 100);

    return { basic: b, hra: h, conv: c, med: m, special: s, arrears: arr, gross, pf: pfAmt, esi: esiAmt, pt: ptAmt, tds: tdsAmt, other: otherAmt, deductions: totalDeductions, netPay: net, error: autoErr };
  }, [monthlyCTC, basicCalcType, basicPct, basicFixed, hraCalcType, hraPct, hraBase, hraFixed, convCalcType, convPct, convFixed, medCalcType, medPct, medFixed, arrearsFixed, specialCalcType, specialPct, specialFixed, pfApplicable, pfCalcType, pfPct, pfBase, pfFixed, esiApplicable, esiCalcType, esiPct, esiFixed, ptApplicable, ptFixed, tdsApplicable, tdsFixed, otherDeductionFixed]);

  const buildSalaryComponentsPayload = () => {
    if (salaryConfigMode === 'ConfigureLater') return [];

    return [
      {
        componentName: 'Basic Salary',
        componentType: 0,
        calculationType: basicCalcType,
        percentage: basicCalcType === 0 ? Math.max(0, parseFloat(basicPct) || 0) : null,
        fixedAmount: basicCalcType === 1 ? Math.max(0, parseFloat(basicFixed) || 0) : null,
        calculationBase: basicCalcType === 0 ? 0 : null,
        monthlyAmount: previewCalc.basic,
        isEarning: true,
        isDeduction: false,
        isEmployerContribution: false
      },
      {
        componentName: 'House Rent Allowance (HRA)',
        componentType: 1,
        calculationType: hraCalcType,
        percentage: hraCalcType === 0 ? Math.max(0, parseFloat(hraPct) || 0) : null,
        fixedAmount: hraCalcType === 1 ? Math.max(0, parseFloat(hraFixed) || 0) : null,
        calculationBase: hraCalcType === 0 ? hraBase : null,
        monthlyAmount: previewCalc.hra,
        isEarning: true,
        isDeduction: false,
        isEmployerContribution: false
      },
      {
        componentName: 'Conveyance Allowance',
        componentType: 2,
        calculationType: convCalcType,
        percentage: convCalcType === 0 ? Math.max(0, parseFloat(convPct) || 0) : null,
        fixedAmount: convCalcType === 1 ? Math.max(0, parseFloat(convFixed) || 0) : null,
        calculationBase: 0,
        monthlyAmount: previewCalc.conv,
        isEarning: true,
        isDeduction: false,
        isEmployerContribution: false
      },
      {
        componentName: 'Medical Allowance',
        componentType: 3,
        calculationType: medCalcType,
        percentage: medCalcType === 0 ? Math.max(0, parseFloat(medPct) || 0) : null,
        fixedAmount: medCalcType === 1 ? Math.max(0, parseFloat(medFixed) || 0) : null,
        calculationBase: 0,
        monthlyAmount: previewCalc.med,
        isEarning: true,
        isDeduction: false,
        isEmployerContribution: false
      },
      {
        componentName: 'Special Allowance',
        componentType: 4,
        calculationType: specialCalcType,
        percentage: specialCalcType === 0 ? Math.max(0, parseFloat(specialPct) || 0) : null,
        fixedAmount: specialCalcType === 1 ? Math.max(0, parseFloat(specialFixed) || 0) : null,
        calculationBase: 0,
        monthlyAmount: previewCalc.special,
        isEarning: true,
        isDeduction: false,
        isEmployerContribution: false
      },
      ...(parseFloat(arrearsFixed) > 0 ? [{
        componentName: 'Arrears',
        componentType: 5,
        calculationType: 1,
        percentage: null,
        fixedAmount: Math.max(0, parseFloat(arrearsFixed) || 0),
        calculationBase: null,
        monthlyAmount: previewCalc.arrears,
        isEarning: true,
        isDeduction: false,
        isEmployerContribution: false
      }] : []),
      ...(pfApplicable ? [{
        componentName: 'Provident Fund (PF)',
        componentType: 6,
        calculationType: pfCalcType,
        percentage: pfCalcType === 0 ? Math.max(0, parseFloat(pfPct) || 0) : null,
        fixedAmount: pfCalcType === 1 ? Math.max(0, parseFloat(pfFixed) || 0) : null,
        calculationBase: pfBase,
        monthlyAmount: previewCalc.pf,
        isEarning: false,
        isDeduction: true,
        isEmployerContribution: false
      }] : []),
      ...(esiApplicable ? [{
        componentName: 'Employee State Insurance (ESI)',
        componentType: 7,
        calculationType: esiCalcType,
        percentage: esiCalcType === 0 ? Math.max(0, parseFloat(esiPct) || 0) : null,
        fixedAmount: esiCalcType === 1 ? Math.max(0, parseFloat(esiFixed) || 0) : null,
        calculationBase: 0,
        monthlyAmount: previewCalc.esi,
        isEarning: false,
        isDeduction: true,
        isEmployerContribution: false
      }] : []),
      ...(ptApplicable ? [{
        componentName: 'Professional Tax',
        componentType: 8,
        calculationType: 1,
        percentage: null,
        fixedAmount: Math.max(0, parseFloat(ptFixed) || 0),
        calculationBase: null,
        monthlyAmount: previewCalc.pt,
        isEarning: false,
        isDeduction: true,
        isEmployerContribution: false
      }] : []),
      ...(tdsApplicable ? [{
        componentName: 'TDS',
        componentType: 9,
        calculationType: 1,
        percentage: null,
        fixedAmount: Math.max(0, parseFloat(tdsFixed) || 0),
        calculationBase: null,
        monthlyAmount: previewCalc.tds,
        isEarning: false,
        isDeduction: true,
        isEmployerContribution: false
      }] : []),
      ...(parseFloat(otherDeductionFixed) > 0 ? [{
        componentName: otherDeductionName || 'Other Deduction',
        componentType: 10,
        calculationType: 1,
        percentage: null,
        fixedAmount: Math.max(0, parseFloat(otherDeductionFixed) || 0),
        calculationBase: null,
        monthlyAmount: previewCalc.other,
        isEarning: false,
        isDeduction: true,
        isEmployerContribution: false
      }] : [])
    ];
  };

  // Options & Lists
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<{ id: number; name: string; employeeCode: string; email: string }[]>([]);

  // Interaction & Validation States
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});

  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Field Input Refs for Auto-Focus & Smooth Scroll
  const codeRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const fatherNameRef = useRef<HTMLInputElement | null>(null);
  const motherNameRef = useRef<HTMLInputElement | null>(null);
  const emg1Ref = useRef<HTMLInputElement | null>(null);
  const emg2Ref = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const deptRef = useRef<HTMLSelectElement | null>(null);
  const desigRef = useRef<HTMLSelectElement | null>(null);
  const dojRef = useRef<HTMLInputElement | null>(null);
  const reportingRef = useRef<HTMLSelectElement | null>(null);
  const shiftStartRef = useRef<HTMLInputElement | null>(null);
  const shiftEndRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
      if (employeeId) {
        fetchEmployeeDetails(employeeId);
      } else {
        resetForm();
      }
    }
  }, [isOpen, employeeId]);

  const fetchMasterData = async () => {
    try {
      const [deptRes, desigRes, empRes] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get('/designations'),
        apiClient.get('/employees?pageSize=200'),
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (desigRes.data.success) setDesignations(desigRes.data.data);
      if (empRes.data.success) setEmployees(empRes.data.data.items);
    } catch {
      // Ignore
    }
  };

  const parsePhoneWithCountryCode = (fullPhone?: string | null) => {
    if (!fullPhone) return { cc: '+91', body: '' };
    const trimmed = fullPhone.trim();
    for (const c of COUNTRY_CODES) {
      if (trimmed.startsWith(c.code)) {
        return { cc: c.code, body: trimmed.substring(c.code.length).trim() };
      }
    }
    if (trimmed.startsWith('+')) {
      const parts = trimmed.split(' ');
      return { cc: parts[0], body: parts.slice(1).join(' ') };
    }
    return { cc: '+91', body: trimmed };
  };

  const fetchEmployeeDetails = async (id: number) => {
    resetForm();
    try {
      const res = await apiClient.get(`/employees/${id}`);
      if (res.data.success) {
        const emp = res.data.data;
        setEmployeeCode(emp.employeeCode);
        setName(emp.name);
        setEmail(emp.email);

        const p = parsePhoneWithCountryCode(emp.phone);
        setPhoneCountryCode(p.cc);
        setPhoneBody(p.body);

        setFatherName(emp.fatherName || '');
        setMotherName(emp.motherName || '');

        const e1 = parsePhoneWithCountryCode(emp.emergencyContact1);
        setEmg1CountryCode(e1.cc);
        setEmg1Body(e1.body);

        const e2 = parsePhoneWithCountryCode(emp.emergencyContact2);
        setEmg2CountryCode(e2.cc);
        setEmg2Body(e2.body);

        setDepartmentId(emp.departmentId);
        setDesignationId(emp.designationId);
        setDesignationFromDate(emp.designationFromDate ? emp.designationFromDate.split('T')[0] : '');
        setReportingPersonId(emp.reportingPersonId || '');
        setDateOfJoining(emp.dateOfJoining ? emp.dateOfJoining.split('T')[0] : '');
        setCompanyName(emp.companyName || 'RNT Technologies');
        setPfNumber(emp.pfNumber || '');
        setPanNumber(emp.panNumber || '');
        setEsiNumber(emp.esiNumber || '');
        setAadhaarNumber(emp.aadhaarNumber || '');
      }

      const workRes = await apiClient.get(`/employees/${id}/work-details`);
      if (workRes.data.success) {
        const work = workRes.data.data;
        setShiftStart(work.shiftStart);
        setShiftEnd(work.shiftEnd);
        setWorkLocation(work.workLocation);
        setEmploymentType(work.employmentType);
      }

      // Fetch Employee-Specific Active Salary Structure
      const salRes = await apiClient.get(`/employees/${id}/salary-structure`);
      if (salRes.data.success && salRes.data.data) {
        const sal = salRes.data.data;
        setAnnualCTC(sal.annualCTC ? sal.annualCTC.toString() : '');
        setSalaryConfigMode(sal.salaryConfigurationMode === 1 ? 'ConfigureNow' : 'ConfigureLater');
        setSalaryEffectiveFrom(sal.effectiveFrom ? sal.effectiveFrom.split('T')[0] : '');
        setPfApplicable(sal.pfApplicable);
        setEsiApplicable(sal.esiApplicable);
        setPtApplicable(sal.professionalTaxApplicable);
        setTdsApplicable(sal.tdsApplicable);

        if (sal.components && Array.isArray(sal.components)) {
          sal.components.forEach((c: any) => {
            switch (c.componentType) {
              case 0: // Basic
                setBasicCalcType(c.calculationType);
                if (c.percentage !== null && c.percentage !== undefined) setBasicPct(c.percentage.toString());
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setBasicFixed(c.fixedAmount.toString());
                break;
              case 1: // HRA
                setHraCalcType(c.calculationType);
                if (c.percentage !== null && c.percentage !== undefined) setHraPct(c.percentage.toString());
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setHraFixed(c.fixedAmount.toString());
                if (c.calculationBase !== null && c.calculationBase !== undefined) setHraBase(c.calculationBase);
                break;
              case 2: // Conveyance
                setConvCalcType(c.calculationType);
                if (c.percentage !== null && c.percentage !== undefined) setConvPct(c.percentage.toString());
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setConvFixed(c.fixedAmount.toString());
                break;
              case 3: // Medical
                setMedCalcType(c.calculationType);
                if (c.percentage !== null && c.percentage !== undefined) setMedPct(c.percentage.toString());
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setMedFixed(c.fixedAmount.toString());
                break;
              case 4: // Special
                setSpecialCalcType(c.calculationType);
                if (c.percentage !== null && c.percentage !== undefined) setSpecialPct(c.percentage.toString());
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setSpecialFixed(c.fixedAmount.toString());
                break;
              case 5: // Arrears
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setArrearsFixed(c.fixedAmount.toString());
                break;
              case 6: // PF
                setPfCalcType(c.calculationType);
                if (c.percentage !== null && c.percentage !== undefined) setPfPct(c.percentage.toString());
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setPfFixed(c.fixedAmount.toString());
                if (c.calculationBase !== null && c.calculationBase !== undefined) setPfBase(c.calculationBase);
                break;
              case 7: // ESI
                setEsiCalcType(c.calculationType);
                if (c.percentage !== null && c.percentage !== undefined) setEsiPct(c.percentage.toString());
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setEsiFixed(c.fixedAmount.toString());
                break;
              case 8: // PT
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setPtFixed(c.fixedAmount.toString());
                break;
              case 9: // TDS
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setTdsFixed(c.fixedAmount.toString());
                break;
              case 10: // Other
                if (c.componentName) setOtherDeductionName(c.componentName);
                if (c.fixedAmount !== null && c.fixedAmount !== undefined) setOtherDeductionFixed(c.fixedAmount.toString());
                break;
            }
          });
        }
      }
    } catch {
      // Ignore
    }
  };

  const resetForm = () => {
    setEmployeeCode('');
    setName('');
    setEmail('');
    setPhoneCountryCode('+91');
    setPhoneBody('');
    setFatherName('');
    setMotherName('');
    setEmg1CountryCode('+91');
    setEmg1Body('');
    setEmg2CountryCode('+91');
    setEmg2Body('');
    setPassword('');
    setShowPassword(false);
    setDepartmentId('');
    setDesignationId('');
    setDesignationFromDate('');
    setReportingPersonId('');
    setDateOfJoining(new Date().toISOString().split('T')[0]);
    setCompanyName('RNT Technologies');
    setPfNumber('');
    setPanNumber('');
    setEsiNumber('');
    setAadhaarNumber('');
    setShiftStart('09:00');
    setShiftEnd('18:00');
    setWorkLocation('Office');
    setEmploymentType('FullTime');

    // Reset Step 3 Payroll & Salary State
    setAnnualCTC('');
    setSalaryConfigMode('ConfigureLater');
    setSalaryEffectiveFrom('');
    setPfApplicable(true);
    setEsiApplicable(true);
    setPtApplicable(true);
    setTdsApplicable(false);
    setBasicCalcType(0);
    setBasicPct('50');
    setBasicFixed('0');
    setHraCalcType(0);
    setHraPct('40');
    setHraBase(1);
    setHraFixed('0');
    setConvCalcType(1);
    setConvFixed('1600');
    setConvPct('0');
    setMedCalcType(1);
    setMedFixed('1250');
    setMedPct('0');
    setSpecialCalcType(2);
    setSpecialPct('0');
    setSpecialFixed('0');
    setArrearsFixed('0');
    setPfCalcType(0);
    setPfPct('12');
    setPfBase(1);
    setPfFixed('0');
    setEsiCalcType(0);
    setEsiPct('0.75');
    setEsiFixed('0');
    setPtFixed('200');
    setTdsFixed('0');
    setOtherDeductionName('Other Deduction');
    setOtherDeductionFixed('0');

    setError('');
    setFieldErrors({});
    setTouched({});
    setShakeFields({});
    setCreatedTempPassword(null);
    setCopied(false);
    setActiveTab('reg');
  };

  // =========================================================================
  // FIELD VALIDATOR FUNCTIONS
  // =========================================================================

  // 1. Employee Code Validation
  const validateCode = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return 'Employee code is required.';
    if (trimmed.length > 20) return 'Employee code must be 20 characters or less.';
    if (trimmed.includes(' ') || !/^[A-Za-z0-9-]+$/.test(trimmed)) {
      return 'Employee code can contain only letters, numbers, and hyphens.';
    }
    if (!employeeId && employees.some(e => e.employeeCode.toUpperCase() === trimmed.toUpperCase())) {
      return 'Employee code already exists.';
    }
    return '';
  };

  // 2. Full Name Validation
  const validateName = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return 'Full name is required.';
    if (trimmed.length < 2) return 'Full name must contain at least 2 characters.';
    if (trimmed.length > 100) return 'Full name must be 100 characters or less.';
    if (!/^[A-Za-z]+(?:[ ]+[A-Za-z]+)*$/.test(trimmed)) {
      return 'Full name can contain only letters and spaces.';
    }
    return '';
  };

  // 3. Email Address Validation
  const validateEmail = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email address is required.';
    if (trimmed.length > 254) return 'Email address must be 254 characters or less.';
    if (trimmed.includes(' ')) return 'Email address cannot contain spaces.';
    
    const emailRegex = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address.';

    if (!employeeId && employees.some(e => e.email.toLowerCase() === trimmed.toLowerCase())) {
      return 'This email address is already registered.';
    }
    return '';
  };

  // 4. Primary Phone Number Validation
  const validatePhone = (cc: string, body: string): string => {
    const trimmedBody = body.trim();
    if (!trimmedBody) return 'Primary phone number is required.';
    if (!cc.startsWith('+')) return 'Phone number must start with + and include a valid country code.';
    
    if (/[a-zA-Z]/.test(trimmedBody)) return 'Please enter a valid international phone number.';

    const fullPhone = `${cc}${trimmedBody}`.replace(/\s+/g, '');
    const e164Regex = /^\+[1-9]\d{7,14}$/;

    if (!e164Regex.test(fullPhone)) {
      const digitsOnly = fullPhone.replace(/\D/g, '');
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        return 'Phone number must contain 8 to 15 digits after formatting.';
      }
      return 'Please enter a valid international phone number.';
    }
    return '';
  };

  // 5. Father's Name Validation (Optional)
  const validateFatherName = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (trimmed.length > 100) return "Father's name must be 100 characters or less.";
    if (!/^[A-Za-z .']+$/.test(trimmed)) return "Please enter a valid father's name.";
    return '';
  };

  // 6. Mother's Name Validation (Optional)
  const validateMotherName = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (trimmed.length > 100) return "Mother's name must be 100 characters or less.";
    if (!/^[A-Za-z .']+$/.test(trimmed)) return "Please enter a valid mother's name.";
    return '';
  };

  // 7. Emergency Contact 1 Validation
  const validateEmg1 = (cc: string, body: string): string => {
    const trimmedBody = body.trim();
    if (!trimmedBody) return 'Emergency contact number 1 is required.';
    if (!cc.startsWith('+')) return 'Please enter the emergency contact with country code.';
    
    if (/[a-zA-Z]/.test(trimmedBody)) return 'Please enter a valid international phone number.';

    const fullPhone = `${cc}${trimmedBody}`.replace(/\s+/g, '');
    const e164Regex = /^\+[1-9]\d{7,14}$/;

    if (!e164Regex.test(fullPhone)) {
      return 'Please enter a valid international phone number.';
    }
    return '';
  };

  // 8. Emergency Contact 2 Validation (Optional)
  const validateEmg2 = (cc: string, body: string): string => {
    const trimmedBody = body.trim();
    if (!trimmedBody) return '';
    if (/[a-zA-Z]/.test(trimmedBody)) return 'Emergency contact number 2 cannot contain letters.';

    const fullPhone = `${cc}${trimmedBody}`.replace(/\s+/g, '');
    const e164Regex = /^\+[1-9]\d{7,14}$/;

    if (!e164Regex.test(fullPhone)) {
      return 'Please enter a valid international phone number.';
    }
    return '';
  };

  // 9. Initial Password Validation (Optional)
  const validatePassword = (val: string): string => {
    if (!val) return ''; // Optional
    if (val.length < 8) return 'Password must be at least 8 characters.';
    if (val.length > 64) return 'Password must be 64 characters or less.';
    if (!/[A-Z]/.test(val)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(val)) return 'Password must contain at least one lowercase letter.';
    if (!/\d/.test(val)) return 'Password must contain at least one number.';
    if (!/[^A-Za-z\d]/.test(val)) return 'Password must contain at least one special character.';
    return '';
  };

  // 10. Department Validation
  const validateDepartment = (val: number | ''): string => {
    if (!val) return 'Please select a department.';
    return '';
  };

  // 11. Designation Validation
  const validateDesignation = (val: number | ''): string => {
    if (!val) return 'Please select a designation.';
    return '';
  };

  // 12. Date of Joining Validation
  const validateDOJ = (val: string): string => {
    if (!val) return 'Date of joining is required.';
    const selectedDate = new Date(val);
    if (isNaN(selectedDate.getTime())) return 'Please enter a valid date.';
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) return 'Date of joining cannot be in the future.';
    return '';
  };

  // 13. Reporting Manager Validation
  const validateReporting = (val: number | ''): string => {
    if (!val) return '';
    if (employeeId && Number(val) === employeeId) return 'An employee cannot report to themselves.';
    return '';
  };

  // 14. Shift Validation
  const validateShift = (start: string, end: string): { start?: string; end?: string } => {
    const errs: { start?: string; end?: string } = {};
    if (!start) errs.start = 'Shift start time is required.';
    if (!end) errs.end = 'Shift end time is required.';
    return errs;
  };

  // Password Strength Estimator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: '', color: '', percent: 0 };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: 'Weak', color: '#EF4444', percent: 33 };
    if (score <= 4) return { label: 'Medium', color: '#F59E0B', percent: 66 };
    return { label: 'Strong', color: '#10B981', percent: 100 };
  };

  // Blur & Change handlers
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    runValidationForField(field);
  };

  const handleChange = (field: string, val: any) => {
    if (field === 'code') setEmployeeCode(val);
    if (field === 'name') setName(val);
    if (field === 'email') setEmail(val);
    if (field === 'phoneCC') setPhoneCountryCode(val);
    if (field === 'phoneBody') setPhoneBody(val);
    if (field === 'fatherName') setFatherName(val);
    if (field === 'motherName') setMotherName(val);
    if (field === 'emg1CC') setEmg1CountryCode(val);
    if (field === 'emg1Body') setEmg1Body(val);
    if (field === 'emg2CC') setEmg2CountryCode(val);
    if (field === 'emg2Body') setEmg2Body(val);
    if (field === 'password') setPassword(val);
    if (field === 'department') setDepartmentId(val);
    if (field === 'designation') setDesignationId(val);
    if (field === 'doj') setDateOfJoining(val);
    if (field === 'reporting') setReportingPersonId(val);
    if (field === 'shiftStart') setShiftStart(val);
    if (field === 'shiftEnd') setShiftEnd(val);

    if (touched[field] || fieldErrors[field as keyof FieldErrors]) {
      runValidationForField(field, val);
    }
  };

  const runValidationForField = (field: string, valOverride?: any) => {
    let err = '';
    if (field === 'code') err = validateCode(valOverride !== undefined ? valOverride : employeeCode);
    if (field === 'name') err = validateName(valOverride !== undefined ? valOverride : name);
    if (field === 'email') err = validateEmail(valOverride !== undefined ? valOverride : email);
    if (field === 'phone' || field === 'phoneBody' || field === 'phoneCC') {
      err = validatePhone(
        field === 'phoneCC' ? valOverride : phoneCountryCode,
        field === 'phoneBody' ? valOverride : phoneBody
      );
    }
    if (field === 'fatherName') err = validateFatherName(valOverride !== undefined ? valOverride : fatherName);
    if (field === 'motherName') err = validateMotherName(valOverride !== undefined ? valOverride : motherName);
    if (field === 'emg1' || field === 'emg1Body' || field === 'emg1CC') {
      err = validateEmg1(
        field === 'emg1CC' ? valOverride : emg1CountryCode,
        field === 'emg1Body' ? valOverride : emg1Body
      );
    }
    if (field === 'emg2' || field === 'emg2Body' || field === 'emg2CC') {
      err = validateEmg2(
        field === 'emg2CC' ? valOverride : emg2CountryCode,
        field === 'emg2Body' ? valOverride : emg2Body
      );
    }
    if (field === 'password') err = validatePassword(valOverride !== undefined ? valOverride : password);
    if (field === 'department') err = validateDepartment(valOverride !== undefined ? valOverride : departmentId);
    if (field === 'designation') err = validateDesignation(valOverride !== undefined ? valOverride : designationId);
    if (field === 'doj') err = validateDOJ(valOverride !== undefined ? valOverride : dateOfJoining);
    if (field === 'reporting') err = validateReporting(valOverride !== undefined ? valOverride : reportingPersonId);

    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  // Step 1 Validation Check
  const validateStep1 = (): boolean => {
    const codeErr = validateCode(employeeCode);
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phoneCountryCode, phoneBody);
    const fatherErr = validateFatherName(fatherName);
    const motherErr = validateMotherName(motherName);
    const emg1Err = validateEmg1(emg1CountryCode, emg1Body);
    const emg2Err = validateEmg2(emg2CountryCode, emg2Body);
    const passErr = validatePassword(password);
    const deptErr = validateDepartment(departmentId);
    const desigErr = validateDesignation(designationId);
    const dojErr = validateDOJ(dateOfJoining);

    const errs: FieldErrors = {
      employeeCode: codeErr,
      name: nameErr,
      email: emailErr,
      phone: phoneErr,
      fatherName: fatherErr,
      motherName: motherErr,
      emergencyContact1: emg1Err,
      emergencyContact2: emg2Err,
      password: passErr,
      departmentId: deptErr,
      designationId: desigErr,
      dateOfJoining: dojErr,
    };

    setFieldErrors(prev => ({ ...prev, ...errs }));
    setTouched(prev => ({
      ...prev,
      code: true, name: true, email: true, phone: true,
      fatherName: true, motherName: true, emg1: true, emg2: true,
      password: true, department: true, designation: true, doj: true
    }));

    const hasErrors = Object.values(errs).some(Boolean);
    if (hasErrors) {
      triggerShake(['code', 'name', 'email', 'phone', 'fatherName', 'motherName', 'emg1', 'emg2', 'password', 'department', 'designation', 'doj']);
      
      // Auto-focus first invalid field and scroll into view
      if (codeErr) { codeRef.current?.focus(); codeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (nameErr) { nameRef.current?.focus(); nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (emailErr) { emailRef.current?.focus(); emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (phoneErr) { phoneRef.current?.focus(); phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (fatherErr) { fatherNameRef.current?.focus(); fatherNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (motherErr) { motherNameRef.current?.focus(); motherNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (emg1Err) { emg1Ref.current?.focus(); emg1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (emg2Err) { emg2Ref.current?.focus(); emg2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (passErr) { passwordRef.current?.focus(); passwordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (deptErr) { deptRef.current?.focus(); deptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (desigErr) { desigRef.current?.focus(); desigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (dojErr) { dojRef.current?.focus(); dojRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      
      return false;
    }
    return true;
  };

  // Step 2 Validation Check
  const validateStep2 = (): boolean => {
    const reportingErr = validateReporting(reportingPersonId);
    setFieldErrors(prev => ({ ...prev, reportingPersonId: reportingErr }));
    setTouched(prev => ({ ...prev, reporting: true }));

    if (reportingErr) {
      triggerShake(['reporting']);
      reportingRef.current?.focus();
      reportingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  // Step 3 Validation Check
  const validateStep3 = (): boolean => {
    const shiftErrs = validateShift(shiftStart, shiftEnd);
    setFieldErrors(prev => ({ ...prev, shiftStart: shiftErrs.start, shiftEnd: shiftErrs.end }));
    setTouched(prev => ({ ...prev, shiftStart: true, shiftEnd: true }));

    if (shiftErrs.start || shiftErrs.end) {
      triggerShake(['shiftStart', 'shiftEnd']);
      if (shiftErrs.start) { shiftStartRef.current?.focus(); shiftStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else if (shiftErrs.end) { shiftEndRef.current?.focus(); shiftEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return false;
    }
    return true;
  };

  const triggerShake = (fields: string[]) => {
    const shakes: Record<string, boolean> = {};
    fields.forEach(f => { shakes[f] = true; });
    setShakeFields(shakes);
    setTimeout(() => setShakeFields({}), 450);
  };

  const handleNext = (e: React.MouseEvent, current: 'reg' | 'rep') => {
    e.preventDefault();
    e.stopPropagation();
    if (current === 'reg') {
      if (validateStep1()) setActiveTab('rep');
    } else if (current === 'rep') {
      if (validateStep2()) setActiveTab('work');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    // Ensure form submission ONLY occurs on the final step (Step 3: Work Details)
    if (activeTab !== 'work') {
      if (activeTab === 'reg') {
        if (validateStep1()) setActiveTab('rep');
      } else if (activeTab === 'rep') {
        if (validateStep2()) setActiveTab('work');
      }
      return;
    }

    // Re-validate all 3 steps simultaneously before submission
    const step1Valid = validateStep1();
    const step2Valid = validateStep2();
    const step3Valid = validateStep3();

    if (!step1Valid) {
      setActiveTab('reg');
      return;
    }
    if (!step2Valid) {
      setActiveTab('rep');
      return;
    }
    if (!step3Valid) {
      setActiveTab('work');
      return;
    }

    setLoading(true);

    try {
      let createdOrUpdatedId = employeeId;
      let tempPass = null;

      // Construct normalized payload
      const normalizedPhone = `${phoneCountryCode}${phoneBody.trim()}`.replace(/\s+/g, '');
      const normalizedEmg1 = `${emg1CountryCode}${emg1Body.trim()}`.replace(/\s+/g, '');
      const normalizedEmg2 = emg2Body.trim() ? `${emg2CountryCode}${emg2Body.trim()}`.replace(/\s+/g, '') : null;

      const payload = {
        employeeCode: employeeCode.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        fatherName: fatherName.trim() || null,
        motherName: motherName.trim() || null,
        emergencyContact1: normalizedEmg1,
        emergencyContact2: normalizedEmg2,
        password: password ? password : null,
        departmentId: Number(departmentId),
        designationId: Number(designationId),
        designationFromDate: designationFromDate || null,
        reportingPersonId: reportingPersonId ? Number(reportingPersonId) : null,
        dateOfJoining,
        companyName: companyName.trim() || null,
        pfNumber: pfNumber.trim() || null,
        panNumber: panNumber.trim() || null,
        esiNumber: esiNumber.trim() || null,
        aadhaarNumber: aadhaarNumber.trim() || null,
        annualCTC: annualCTC ? parseFloat(annualCTC) : null,
        salaryConfigurationMode: salaryConfigMode === 'ConfigureNow' ? 1 : 0,
        salaryEffectiveFrom: salaryEffectiveFrom || dateOfJoining,
        pfApplicable,
        esiApplicable,
        professionalTaxApplicable: ptApplicable,
        tdsApplicable,
        salaryComponents: buildSalaryComponentsPayload()
      };

      if (employeeId) {
        await apiClient.put(`/employees/${employeeId}`, payload);
      } else {
        const res = await apiClient.post('/employees', payload);
        createdOrUpdatedId = res.data.data.id;
        tempPass = res.data.data.temporaryPassword;
      }

      // Update Work Details
      if (createdOrUpdatedId) {
        await apiClient.put(`/employees/${createdOrUpdatedId}/work-details`, {
          shiftStart,
          shiftEnd,
          workLocation,
          employmentType,
        });

        // Persist Employee-Specific Salary Details to database
        if (annualCTC && parseFloat(annualCTC) >= 0) {
          await apiClient.post(`/employees/${createdOrUpdatedId}/salary-structure`, {
            annualCTC: parseFloat(annualCTC),
            salaryConfigurationMode: salaryConfigMode === 'ConfigureNow' ? 1 : 0,
            effectiveFrom: salaryEffectiveFrom || dateOfJoining,
            pfApplicable,
            esiApplicable,
            professionalTaxApplicable: ptApplicable,
            tdsApplicable,
            components: buildSalaryComponentsPayload()
          });
        }
      }

      onSaved();

      if (tempPass) {
        setCreatedTempPassword(tempPass);
      } else {
        onClose();
      }
    } catch (err: any) {
      let serverMsg = 'Failed to save employee details. Please check form values.';
      const data = err.response?.data;

      if (data) {
        if (typeof data.message === 'string' && data.message.trim()) {
          serverMsg = data.message;
        } else if (typeof data.title === 'string' && data.title.trim()) {
          serverMsg = data.title;
        } else if (typeof data === 'string') {
          serverMsg = data;
        }
      }

      const newFieldErrs: FieldErrors = { ...fieldErrors };
      const rawErrors = data?.errors;

      if (Array.isArray(rawErrors)) {
        if (rawErrors.length > 0 && typeof rawErrors[0] === 'string') {
          serverMsg = rawErrors.join(' | ');
        }
        rawErrors.forEach((errMsg: any) => {
          if (typeof errMsg === 'string') {
            const lower = errMsg.toLowerCase();
            if (lower.includes('email')) newFieldErrs.email = errMsg;
            else if (lower.includes('code')) newFieldErrs.employeeCode = errMsg;
            else if (lower.includes('name')) newFieldErrs.name = errMsg;
            else if (lower.includes('phone')) newFieldErrs.phone = errMsg;
          }
        });
      } else if (rawErrors && typeof rawErrors === 'object') {
        const errList: string[] = [];
        Object.entries(rawErrors).forEach(([key, val]) => {
          const keyLower = key.toLowerCase();
          const msgs = Array.isArray(val) ? val : [val];
          msgs.forEach((errMsg: any) => {
            if (typeof errMsg === 'string') {
              errList.push(errMsg);
              if (keyLower.includes('email')) newFieldErrs.email = errMsg;
              else if (keyLower.includes('code')) newFieldErrs.employeeCode = errMsg;
              else if (keyLower.includes('name')) newFieldErrs.name = errMsg;
              else if (keyLower.includes('phone')) newFieldErrs.phone = errMsg;
            }
          });
        });
        if (errList.length > 0) {
          serverMsg = errList.join(' | ');
        }
      }

      setError(serverMsg);
      setFieldErrors(newFieldErrs);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (createdTempPassword) {
      navigator.clipboard.writeText(`Username: ${email.toLowerCase()}\nPassword: ${createdTempPassword}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const passStrength = getPasswordStrength(password);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '720px', borderRadius: '18px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        {createdTempPassword ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                display: 'inline-flex',
                padding: '1rem',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                marginBottom: '1rem'
              }}>
                <CheckCircle size={38} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F5F5F5', marginBottom: '0.5rem' }}>Employee Created Successfully!</h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                Account credentials generated. Hand these credentials to the employee to sign in.
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>EMPLOYEE NAME</span>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#F5F5F5' }}>{name} ({employeeCode})</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>USERNAME / EMAIL</span>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#E8873C' }}>{email.toLowerCase()}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>INITIAL TEMPORARY PASSWORD</span>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#F59E0B', fontFamily: 'monospace' }}>
                  {createdTempPassword}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.5rem', textAlign: 'center' }}>
              * The employee will be prompted to change this password upon their first login.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCopyCredentials}>
                <Copy size={16} />
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose} style={{ background: '#E8873C', borderColor: '#E8873C' }}>
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F5F5F5', margin: 0 }}>
                {employeeId ? 'Edit Employee Profile' : 'New Employee Registration'}
              </h3>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Backend Failure Banner */}
            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
                <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* 3-Step Wizard Navigation Header */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <button
                type="button"
                className={`btn ${activeTab === 'reg' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('reg')}
                style={{
                  flex: 1,
                  fontSize: '0.825rem',
                  padding: '0.5rem 0.75rem',
                  background: activeTab === 'reg' ? 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)' : '#F8FAFC',
                  color: activeTab === 'reg' ? '#FFFFFF' : '#475569',
                  borderColor: activeTab === 'reg' ? '#7B61FF' : '#E2E8F0'
                }}
              >
                <UserPlus size={15} />
                <span>1. Registration</span>
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'rep' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  if (validateStep1()) setActiveTab('rep');
                }}
                style={{
                  flex: 1,
                  fontSize: '0.825rem',
                  padding: '0.5rem 0.75rem',
                  background: activeTab === 'rep' ? 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)' : '#F8FAFC',
                  color: activeTab === 'rep' ? '#FFFFFF' : '#475569',
                  borderColor: activeTab === 'rep' ? '#7B61FF' : '#E2E8F0'
                }}
              >
                <UserCheck size={15} />
                <span>2. Reporting Person</span>
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'work' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  if (validateStep1() && validateStep2()) setActiveTab('work');
                }}
                style={{
                  flex: 1,
                  fontSize: '0.825rem',
                  padding: '0.5rem 0.75rem',
                  background: activeTab === 'work' ? 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)' : '#F8FAFC',
                  color: activeTab === 'work' ? '#FFFFFF' : '#475569',
                  borderColor: activeTab === 'work' ? '#7B61FF' : '#E2E8F0'
                }}
              >
                <Clock size={15} />
                <span>3. Work Details</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* ========================================================================= */}
              {/* STEP 1: REGISTRATION & PERSONAL/EMERGENCY INFO */}
              {/* ========================================================================= */}
              {activeTab === 'reg' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    
                    {/* 1. Employee Code */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                          Employee Code *
                        </label>
                        <span style={{ fontSize: '0.7rem', color: employeeCode.length > 20 ? '#EF4444' : '#94A3B8' }}>
                          {employeeCode.length}/20
                        </span>
                      </div>
                      <div className={shakeFields.code ? 'shake-field' : ''} style={{ position: 'relative' }}>
                        <input
                          ref={codeRef}
                          type="text"
                          className="form-input"
                          maxLength={20}
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.employeeCode ? '#EF4444' : touched.code && !fieldErrors.employeeCode && employeeCode ? '#10B981' : '#CBD5E1',
                            backgroundColor: fieldErrors.employeeCode ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)',
                            paddingRight: touched.code && !fieldErrors.employeeCode && employeeCode ? '2rem' : '0.8rem'
                          }}
                          value={employeeCode}
                          onChange={(e) => handleChange('code', e.target.value)}
                          onBlur={() => handleBlur('code')}
                          placeholder="EMP-001"
                          disabled={!!employeeId}
                        />
                        {touched.code && !fieldErrors.employeeCode && employeeCode && (
                          <Check size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />
                        )}
                      </div>
                      {fieldErrors.employeeCode && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.employeeCode}
                        </span>
                      )}
                    </div>

                    {/* 2. Full Name */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                          Full Name *
                        </label>
                        <span style={{ fontSize: '0.7rem', color: name.length > 100 ? '#EF4444' : '#94A3B8' }}>
                          {name.length}/100
                        </span>
                      </div>
                      <div className={shakeFields.name ? 'shake-field' : ''} style={{ position: 'relative' }}>
                        <input
                          ref={nameRef}
                          type="text"
                          className="form-input"
                          maxLength={100}
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.name ? '#EF4444' : touched.name && !fieldErrors.name && name ? '#10B981' : '#CBD5E1',
                            backgroundColor: fieldErrors.name ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)',
                            paddingRight: touched.name && !fieldErrors.name && name ? '2rem' : '0.8rem'
                          }}
                          value={name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          onBlur={() => handleBlur('name')}
                          placeholder="John Doe"
                        />
                        {touched.name && !fieldErrors.name && name && (
                          <Check size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />
                        )}
                      </div>
                      {fieldErrors.name && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    
                    {/* 3. Email Address */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                          Email Address (Username) *
                        </label>
                        <span style={{ fontSize: '0.7rem', color: email.length > 254 ? '#EF4444' : '#94A3B8' }}>
                          {email.length}/254
                        </span>
                      </div>
                      <div className={shakeFields.email ? 'shake-field' : ''} style={{ position: 'relative' }}>
                        <input
                          ref={emailRef}
                          type="email"
                          className="form-input"
                          maxLength={254}
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.email ? '#EF4444' : touched.email && !fieldErrors.email && email ? '#10B981' : '#CBD5E1',
                            backgroundColor: fieldErrors.email ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)',
                            paddingRight: touched.email && !fieldErrors.email && email ? '2rem' : '0.8rem'
                          }}
                          value={email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          placeholder="john@company.com"
                        />
                        {touched.email && !fieldErrors.email && email && (
                          <Check size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.2rem', display: 'block' }}>
                        Use a valid company email address. Maximum 254 characters.
                      </span>
                      {fieldErrors.email && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.email}
                        </span>
                      )}
                    </div>

                    {/* 4. Primary Phone Number */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Primary Phone Number *
                      </label>
                      <div className={shakeFields.phone ? 'shake-field' : ''} style={{ display: 'flex', gap: '0.4rem' }}>
                        <select
                          className="form-select"
                          style={{
                            width: '110px',
                            borderRadius: '10px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            paddingRight: '1.5rem',
                            borderColor: fieldErrors.phone ? '#EF4444' : '#CBD5E1'
                          }}
                          value={phoneCountryCode}
                          onChange={(e) => handleChange('phoneCC', e.target.value)}
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} ({c.country})</option>
                          ))}
                        </select>

                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            ref={phoneRef}
                            type="text"
                            className="form-input"
                            style={{
                              borderRadius: '10px',
                              borderColor: fieldErrors.phone ? '#EF4444' : touched.phone && !fieldErrors.phone && phoneBody ? '#10B981' : '#CBD5E1',
                              backgroundColor: fieldErrors.phone ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)',
                              paddingRight: touched.phone && !fieldErrors.phone && phoneBody ? '2rem' : '0.8rem'
                            }}
                            value={phoneBody}
                            onChange={(e) => handleChange('phoneBody', e.target.value)}
                            onBlur={() => handleBlur('phone')}
                            placeholder="98765 43210"
                          />
                          {touched.phone && !fieldErrors.phone && phoneBody && (
                            <Check size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.2rem', display: 'block' }}>
                        International format: Country code + 8 to 15 digits
                      </span>
                      {fieldErrors.phone && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Family Information Row: Father & Mother Name */}
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#F5F5F5' }}>
                      <Users size={14} style={{ color: '#E8873C' }} />
                      <span>Family Information (Optional)</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* 5. Father Name */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label" style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            Father's Name
                          </label>
                          <span style={{ fontSize: '0.7rem', color: fatherName.length > 100 ? '#EF4444' : '#94A3B8' }}>
                            {fatherName.length}/100
                          </span>
                        </div>
                        <div className={shakeFields.fatherName ? 'shake-field' : ''}>
                          <input
                            ref={fatherNameRef}
                            type="text"
                            className="form-input"
                            maxLength={100}
                            style={{
                              borderRadius: '10px',
                              borderColor: fieldErrors.fatherName ? '#EF4444' : '#CBD5E1',
                              backgroundColor: fieldErrors.fatherName ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                            }}
                            value={fatherName}
                            onChange={(e) => handleChange('fatherName', e.target.value)}
                            onBlur={() => handleBlur('fatherName')}
                            placeholder="Father's Full Name"
                          />
                        </div>
                        {fieldErrors.fatherName && (
                          <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                            ⚠️ {fieldErrors.fatherName}
                          </span>
                        )}
                      </div>

                      {/* 6. Mother Name */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label" style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            Mother's Name
                          </label>
                          <span style={{ fontSize: '0.7rem', color: motherName.length > 100 ? '#EF4444' : '#94A3B8' }}>
                            {motherName.length}/100
                          </span>
                        </div>
                        <div className={shakeFields.motherName ? 'shake-field' : ''}>
                          <input
                            ref={motherNameRef}
                            type="text"
                            className="form-input"
                            maxLength={100}
                            style={{
                              borderRadius: '10px',
                              borderColor: fieldErrors.motherName ? '#EF4444' : '#CBD5E1',
                              backgroundColor: fieldErrors.motherName ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                            }}
                            value={motherName}
                            onChange={(e) => handleChange('motherName', e.target.value)}
                            onBlur={() => handleBlur('motherName')}
                            placeholder="Mother's Full Name"
                          />
                        </div>
                        {fieldErrors.motherName && (
                          <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                            ⚠️ {fieldErrors.motherName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contacts Row */}
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 122, 89, 0.06)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 122, 89, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#FF7A59' }}>
                      <PhoneCall size={14} />
                      <span>Emergency Contacts</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* 7. Emergency Contact 1 */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                          Emergency Contact 1 *
                        </label>
                        <div className={shakeFields.emg1 ? 'shake-field' : ''} style={{ display: 'flex', gap: '0.4rem' }}>
                          <select
                            className="form-select"
                            style={{
                              width: '100px',
                              borderRadius: '10px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              paddingRight: '1.5rem',
                              borderColor: fieldErrors.emergencyContact1 ? '#EF4444' : '#CBD5E1'
                            }}
                            value={emg1CountryCode}
                            onChange={(e) => handleChange('emg1CC', e.target.value)}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>{c.code}</option>
                            ))}
                          </select>
                          <input
                            ref={emg1Ref}
                            type="text"
                            className="form-input"
                            style={{
                              borderRadius: '10px',
                              borderColor: fieldErrors.emergencyContact1 ? '#EF4444' : touched.emg1 && !fieldErrors.emergencyContact1 && emg1Body ? '#10B981' : '#CBD5E1',
                              backgroundColor: fieldErrors.emergencyContact1 ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                            }}
                            value={emg1Body}
                            onChange={(e) => handleChange('emg1Body', e.target.value)}
                            onBlur={() => handleBlur('emg1')}
                            placeholder="98765 00001"
                          />
                        </div>
                        {fieldErrors.emergencyContact1 && (
                          <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                            ⚠️ {fieldErrors.emergencyContact1}
                          </span>
                        )}
                      </div>

                      {/* 8. Emergency Contact 2 */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                          Emergency Contact 2 (Optional)
                        </label>
                        <div className={shakeFields.emg2 ? 'shake-field' : ''} style={{ display: 'flex', gap: '0.4rem' }}>
                          <select
                            className="form-select"
                            style={{
                              width: '100px',
                              borderRadius: '10px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              paddingRight: '1.5rem',
                              borderColor: fieldErrors.emergencyContact2 ? '#EF4444' : '#CBD5E1'
                            }}
                            value={emg2CountryCode}
                            onChange={(e) => handleChange('emg2CC', e.target.value)}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>{c.code}</option>
                            ))}
                          </select>
                          <input
                            ref={emg2Ref}
                            type="text"
                            className="form-input"
                            style={{
                              borderRadius: '10px',
                              borderColor: fieldErrors.emergencyContact2 ? '#EF4444' : '#CBD5E1',
                              backgroundColor: fieldErrors.emergencyContact2 ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                            }}
                            value={emg2Body}
                            onChange={(e) => handleChange('emg2Body', e.target.value)}
                            onBlur={() => handleBlur('emg2')}
                            placeholder="98765 00002"
                          />
                        </div>
                        {fieldErrors.emergencyContact2 && (
                          <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                            ⚠️ {fieldErrors.emergencyContact2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 9. Initial Password (Optional) */}
                  {!employeeId && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                          <Key size={14} style={{ marginRight: '0.3rem', display: 'inline-block', color: '#E8873C' }} />
                          Initial Password (Optional)
                        </label>
                        {password && (
                          <span style={{ fontSize: '0.7rem', color: password.length > 64 ? '#EF4444' : '#94A3B8' }}>
                            {password.length}/64
                          </span>
                        )}
                      </div>
                      <div className={shakeFields.password ? 'shake-field' : ''} style={{ position: 'relative' }}>
                        <input
                          ref={passwordRef}
                          type={showPassword ? 'text' : 'password'}
                          className="form-input"
                          maxLength={64}
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.password ? '#EF4444' : touched.password && !fieldErrors.password && password ? '#10B981' : '#CBD5E1',
                            backgroundColor: fieldErrors.password ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)',
                            paddingRight: '2.5rem'
                          }}
                          value={password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          onBlur={() => handleBlur('password')}
                          placeholder="e.g. Emp@123456 (Leave blank to auto-generate)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      
                      {password ? (
                        <div style={{ marginTop: '0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '0.2rem' }}>
                            <span style={{ color: '#64748B' }}>Password Strength:</span>
                            <span style={{ fontWeight: 700, color: passStrength.color }}>{passStrength.label}</span>
                          </div>
                          <div style={{ height: '4px', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${passStrength.percent}%`, backgroundColor: passStrength.color, transition: 'all 0.3s ease' }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                          If left blank, a secure temporary password will be auto-generated.
                        </span>
                      )}

                      {fieldErrors.password && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.password}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    
                    {/* 10. Department */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Department *
                      </label>
                      <div className={shakeFields.department ? 'shake-field' : ''}>
                        <select
                          ref={deptRef}
                          className="form-select"
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.departmentId ? '#EF4444' : touched.department && !fieldErrors.departmentId && departmentId ? '#10B981' : '#CBD5E1',
                            backgroundColor: fieldErrors.departmentId ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                          }}
                          value={departmentId}
                          onChange={(e) => handleChange('department', e.target.value ? Number(e.target.value) : '')}
                          onBlur={() => handleBlur('department')}
                        >
                          <option value="">Select Department</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      {fieldErrors.departmentId && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.departmentId}
                        </span>
                      )}
                    </div>

                    {/* 11. Designation */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Designation *
                      </label>
                      <div className={shakeFields.designation ? 'shake-field' : ''}>
                        <select
                          ref={desigRef}
                          className="form-select"
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.designationId ? '#EF4444' : touched.designation && !fieldErrors.designationId && designationId ? '#10B981' : '#CBD5E1',
                            backgroundColor: fieldErrors.designationId ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                          }}
                          value={designationId}
                          onChange={(e) => handleChange('designation', e.target.value ? Number(e.target.value) : '')}
                          onBlur={() => handleBlur('designation')}
                        >
                          <option value="">Select Designation</option>
                          {designations.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      {fieldErrors.designationId && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.designationId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 12. Date of Joining & Designation From */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Date of Joining *
                      </label>
                      <div className={shakeFields.doj ? 'shake-field' : ''}>
                        <input
                          ref={dojRef}
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          className="form-input"
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.dateOfJoining ? '#EF4444' : touched.doj && !fieldErrors.dateOfJoining && dateOfJoining ? '#10B981' : '#CBD5E1',
                            backgroundColor: fieldErrors.dateOfJoining ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                          }}
                          value={dateOfJoining}
                          onChange={(e) => handleChange('doj', e.target.value)}
                          onBlur={() => handleBlur('doj')}
                        />
                      </div>
                      {fieldErrors.dateOfJoining && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.dateOfJoining}
                        </span>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Designation From Date
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        style={{ borderRadius: '10px' }}
                        value={designationFromDate}
                        onChange={(e) => setDesignationFromDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Company & Statutory Info Header */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginTop: '0.5rem'
                  }}>
                    🏢 Company & Statutory Details
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ borderRadius: '10px' }}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. RNT Technologies"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                          PF Number (Max 25)
                        </label>
                        <span style={{ fontSize: '0.7rem', color: pfNumber.length > 25 ? '#EF4444' : '#94A3B8' }}>
                          {pfNumber.length}/25
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={25}
                        className="form-input"
                        style={{ borderRadius: '10px', fontSize: '0.825rem' }}
                        value={pfNumber}
                        onChange={(e) => setPfNumber(e.target.value)}
                        placeholder="PF12345678"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                          PAN Number (Max 25)
                        </label>
                        <span style={{ fontSize: '0.7rem', color: panNumber.length > 25 ? '#EF4444' : '#94A3B8' }}>
                          {panNumber.length}/25
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={25}
                        className="form-input"
                        style={{ borderRadius: '10px', fontSize: '0.825rem' }}
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                          ESI Number (Max 25)
                        </label>
                        <span style={{ fontSize: '0.7rem', color: esiNumber.length > 25 ? '#EF4444' : '#94A3B8' }}>
                          {esiNumber.length}/25
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={25}
                        className="form-input"
                        style={{ borderRadius: '10px', fontSize: '0.825rem' }}
                        value={esiNumber}
                        onChange={(e) => setEsiNumber(e.target.value)}
                        placeholder="3100012345"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                          Aadhaar Number (Max 25)
                        </label>
                        <span style={{ fontSize: '0.7rem', color: aadhaarNumber.length > 25 ? '#EF4444' : '#94A3B8' }}>
                          {aadhaarNumber.length}/25
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={25}
                        className="form-input"
                        style={{ borderRadius: '10px', fontSize: '0.825rem' }}
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        placeholder="1234 5678 9012"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 2: REPORTING PERSON */}
              {/* ========================================================================= */}
              {activeTab === 'rep' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                      Reporting Manager / Person *
                    </label>
                    <div className={shakeFields.reporting ? 'shake-field' : ''}>
                      <select
                        ref={reportingRef}
                        className="form-select"
                        style={{
                          borderRadius: '10px',
                          borderColor: fieldErrors.reportingPersonId ? '#EF4444' : touched.reporting && !fieldErrors.reportingPersonId && reportingPersonId ? '#10B981' : '#CBD5E1',
                          backgroundColor: fieldErrors.reportingPersonId ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)'
                        }}
                        value={reportingPersonId}
                        onChange={(e) => handleChange('reporting', e.target.value ? Number(e.target.value) : '')}
                        onBlur={() => handleBlur('reporting')}
                      >
                        <option value="">Select Reporting Manager</option>
                        {employees
                          .filter((emp) => emp.id !== employeeId)
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
                          ))}
                      </select>
                    </div>
                    {fieldErrors.reportingPersonId ? (
                      <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                        ⚠️ {fieldErrors.reportingPersonId}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                        Select the designated manager responsible for leave approvals and performance evaluations.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 3: WORK DETAILS */}
              {/* ========================================================================= */}
              {activeTab === 'work' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    
                    {/* Shift Start */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Shift Start Time *
                      </label>
                      <div className={shakeFields.shiftStart ? 'shake-field' : ''}>
                        <input
                          ref={shiftStartRef}
                          type="time"
                          className="form-input"
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.shiftStart ? '#EF4444' : '#CBD5E1'
                          }}
                          value={shiftStart}
                          onChange={(e) => handleChange('shiftStart', e.target.value)}
                        />
                      </div>
                      {fieldErrors.shiftStart && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.shiftStart}
                        </span>
                      )}
                    </div>

                    {/* Shift End */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Shift End Time *
                      </label>
                      <div className={shakeFields.shiftEnd ? 'shake-field' : ''}>
                        <input
                          ref={shiftEndRef}
                          type="time"
                          className="form-input"
                          style={{
                            borderRadius: '10px',
                            borderColor: fieldErrors.shiftEnd ? '#EF4444' : '#CBD5E1'
                          }}
                          value={shiftEnd}
                          onChange={(e) => handleChange('shiftEnd', e.target.value)}
                        />
                      </div>
                      {fieldErrors.shiftEnd && (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
                          ⚠️ {fieldErrors.shiftEnd}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    
                    {/* Work Location */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Work Location *
                      </label>
                      <select
                        className="form-select"
                        style={{ borderRadius: '10px' }}
                        value={workLocation}
                        onChange={(e) => setWorkLocation(e.target.value)}
                      >
                        <option value="Office">Office</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    {/* Employment Type */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
                        Employment Type *
                      </label>
                      <select
                        className="form-select"
                        style={{ borderRadius: '10px' }}
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                      >
                        <option value="FullTime">Full Time</option>
                        <option value="PartTime">Part Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>
                  </div>

                  {/* Payroll & Salary Details Section */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Calculator size={18} style={{ color: '#E8873C' }} />
                    <span>Payroll & Salary Details</span>
                  </div>

                  {/* Basic Payroll Information */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                        Annual CTC (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        className="form-input"
                        style={{ borderRadius: '10px', fontSize: '0.825rem', fontWeight: 700 }}
                        value={annualCTC}
                        onKeyDown={handleKeyDownNonNegative}
                        onChange={handleNonNegativeChange(setAnnualCTC)}
                        placeholder="e.g. 400000"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                        Monthly CTC (Derived)
                      </label>
                      <input
                        type="text"
                        disabled
                        className="form-input"
                        style={{ borderRadius: '10px', fontSize: '0.825rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.08)', color: '#F5F5F5' }}
                        value={monthlyCTC ? `₹ ${monthlyCTC.toLocaleString('en-IN')}` : '₹ 0.00'}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.8rem' }}>
                        Salary Effective From
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        style={{ borderRadius: '10px', fontSize: '0.825rem' }}
                        value={salaryEffectiveFrom}
                        onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Salary Configuration Mode Selection */}
                  <div style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '0.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#F5F5F5', fontSize: '0.825rem', display: 'block', marginBottom: '0.5rem' }}>
                      Salary Structure Mode
                    </label>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="salaryConfigMode"
                          value="ConfigureLater"
                          checked={salaryConfigMode === 'ConfigureLater'}
                          onChange={() => setSalaryConfigMode('ConfigureLater')}
                        />
                        <span>Configure Later (Basic CTC setup only)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="salaryConfigMode"
                          value="ConfigureNow"
                          checked={salaryConfigMode === 'ConfigureNow'}
                          onChange={() => setSalaryConfigMode('ConfigureNow')}
                        />
                        <span>Configure Now (Detailed component breakdown)</span>
                      </label>
                    </div>
                  </div>

                  {salaryConfigMode === 'ConfigureNow' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                      {/* Applicability Flags */}
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.75rem 1rem', background: '#EEF2FF', borderRadius: '10px', border: '1px solid #C7D2FE' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={pfApplicable} onChange={(e) => setPfApplicable(e.target.checked)} />
                          <span>PF Applicable</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={esiApplicable} onChange={(e) => setEsiApplicable(e.target.checked)} />
                          <span>ESI Applicable</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={ptApplicable} onChange={(e) => setPtApplicable(e.target.checked)} />
                          <span>Professional Tax</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={tdsApplicable} onChange={(e) => setTdsApplicable(e.target.checked)} />
                          <span>TDS Applicable</span>
                        </label>
                      </div>

                      {/* Detailed Earnings Configuration */}
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.8rem', color: '#1E293B', borderBottom: '1px solid #E2E8F0' }}>
                          💵 Earnings Configuration
                        </div>
                        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {/* Basic Salary */}
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600 }}>Basic Salary</span>
                            <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={basicCalcType} onChange={(e) => setBasicCalcType(Number(e.target.value))}>
                              <option value={0}>Percentage (%)</option>
                              <option value={1}>Fixed Amount</option>
                            </select>
                            {basicCalcType === 0 ? (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={basicPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setBasicPct)} placeholder="%" />
                            ) : (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={basicFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setBasicFixed)} placeholder="₹" />
                            )}
                            <span style={{ fontSize: '0.725rem', color: '#64748B' }}>Base: Monthly CTC</span>
                            <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.basic.toLocaleString('en-IN')}</span>
                          </div>

                          {/* HRA */}
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600 }}>HRA</span>
                            <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={hraCalcType} onChange={(e) => setHraCalcType(Number(e.target.value))}>
                              <option value={0}>Percentage (%)</option>
                              <option value={1}>Fixed Amount</option>
                            </select>
                            {hraCalcType === 0 ? (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={hraPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setHraPct)} placeholder="%" />
                            ) : (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={hraFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setHraFixed)} placeholder="₹" />
                            )}
                            {hraCalcType === 0 ? (
                              <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.75rem' }} value={hraBase} onChange={(e) => setHraBase(Number(e.target.value))}>
                                <option value={1}>Basic Salary</option>
                                <option value={0}>Monthly CTC</option>
                              </select>
                            ) : <span></span>}
                            <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.hra.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Conveyance */}
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600 }}>Conveyance</span>
                            <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={convCalcType} onChange={(e) => setConvCalcType(Number(e.target.value))}>
                              <option value={1}>Fixed Amount</option>
                              <option value={0}>Percentage (%)</option>
                            </select>
                            {convCalcType === 1 ? (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={convFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setConvFixed)} placeholder="₹" />
                            ) : (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={convPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setConvPct)} placeholder="%" />
                            )}
                            <span></span>
                            <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.conv.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Medical */}
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600 }}>Medical Allowance</span>
                            <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={medCalcType} onChange={(e) => setMedCalcType(Number(e.target.value))}>
                              <option value={1}>Fixed Amount</option>
                              <option value={0}>Percentage (%)</option>
                            </select>
                            {medCalcType === 1 ? (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={medFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setMedFixed)} placeholder="₹" />
                            ) : (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={medPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setMedPct)} placeholder="%" />
                            )}
                            <span></span>
                            <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.med.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Arrears */}
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600 }}>Arrears</span>
                            <span style={{ fontSize: '0.785rem', color: '#64748B' }}>Fixed Amount</span>
                            <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={arrearsFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setArrearsFixed)} placeholder="₹" />
                            <span></span>
                            <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.arrears.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Special Allowance */}
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600 }}>Special Allowance</span>
                            <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={specialCalcType} onChange={(e) => setSpecialCalcType(Number(e.target.value))}>
                              <option value={2}>Auto Balance</option>
                              <option value={0}>Percentage (%)</option>
                              <option value={1}>Fixed Amount</option>
                            </select>
                            {specialCalcType === 2 ? (
                              <span style={{ fontSize: '0.725rem', color: '#64748B', fontStyle: 'italic' }}>Auto calculated</span>
                            ) : specialCalcType === 0 ? (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={specialPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setSpecialPct)} placeholder="%" />
                            ) : (
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={specialFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setSpecialFixed)} placeholder="₹" />
                            )}
                            <span></span>
                            <span style={{ fontWeight: 700, color: previewCalc.special < 0 ? '#EF4444' : '#059669', textAlign: 'right' }}>
                              ₹ {previewCalc.special.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions Configuration */}
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.8rem', color: '#1E293B', borderBottom: '1px solid #E2E8F0' }}>
                          🔻 Employee Deductions Configuration
                        </div>
                        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {pfApplicable && (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 600 }}>Employee PF</span>
                              <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={pfCalcType} onChange={(e) => setPfCalcType(Number(e.target.value))}>
                                <option value={0}>Percentage (%)</option>
                                <option value={1}>Fixed Amount</option>
                              </select>
                              {pfCalcType === 0 ? (
                                <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={pfPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setPfPct)} placeholder="%" />
                              ) : (
                                <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={pfFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setPfFixed)} placeholder="₹" />
                              )}
                              {pfCalcType === 0 ? (
                                <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.75rem' }} value={pfBase} onChange={(e) => setPfBase(Number(e.target.value))}>
                                  <option value={1}>Basic Salary</option>
                                  <option value={0}>Monthly CTC</option>
                                </select>
                              ) : <span></span>}
                              <span style={{ fontWeight: 700, color: '#DC2626', textAlign: 'right' }}>₹ {previewCalc.pf.toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          {esiApplicable && (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 600 }}>Employee ESI</span>
                              <select className="form-select" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={esiCalcType} onChange={(e) => setEsiCalcType(Number(e.target.value))}>
                                <option value={0}>Percentage (%)</option>
                                <option value={1}>Fixed Amount</option>
                              </select>
                              {esiCalcType === 0 ? (
                                <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={esiPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setEsiPct)} placeholder="%" />
                              ) : (
                                <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={esiFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setEsiFixed)} placeholder="₹" />
                              )}
                              <span></span>
                              <span style={{ fontWeight: 700, color: '#DC2626', textAlign: 'right' }}>₹ {previewCalc.esi.toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          {ptApplicable && (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 600 }}>Professional Tax</span>
                              <span style={{ fontSize: '0.785rem', color: '#64748B' }}>Fixed Amount</span>
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={ptFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setPtFixed)} placeholder="₹" />
                              <span></span>
                              <span style={{ fontWeight: 700, color: '#DC2626', textAlign: 'right' }}>₹ {previewCalc.pt.toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          {tdsApplicable && (
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 600 }}>TDS</span>
                              <span style={{ fontSize: '0.785rem', color: '#64748B' }}>Fixed Amount</span>
                              <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={tdsFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setTdsFixed)} placeholder="₹" />
                              <span></span>
                              <span style={{ fontWeight: 700, color: '#DC2626', textAlign: 'right' }}>₹ {previewCalc.tds.toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          {/* Other Deduction */}
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 100px 100px 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <input type="text" className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={otherDeductionName} onChange={(e) => setOtherDeductionName(e.target.value)} placeholder="Deduction Name" />
                            <span style={{ fontSize: '0.785rem', color: '#64748B' }}>Fixed Amount</span>
                            <input type="number" min={0} className="form-input" style={{ padding: '0.3rem', fontSize: '0.785rem' }} value={otherDeductionFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setOtherDeductionFixed)} placeholder="₹" />
                            <span></span>
                            <span style={{ fontWeight: 700, color: '#DC2626', textAlign: 'right' }}>₹ {previewCalc.other.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Live Calculation Preview Summary Box */}
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#F5F5F5', marginBottom: '0.75rem' }}>
                          <Calculator size={16} style={{ color: '#E8873C' }} />
                          <span>Live Salary Structure Preview</span>
                        </div>

                        {previewCalc.error && (
                          <div style={{ color: '#EF4444', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                            ⚠️ {previewCalc.error}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                          <div style={{ background: '#ECFDF5', padding: '0.6rem', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                            <span style={{ fontSize: '0.7rem', color: '#047857', display: 'block', fontWeight: 600 }}>Total Gross Earnings</span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#065F46' }}>₹ {previewCalc.gross.toLocaleString('en-IN')}</span>
                          </div>

                          <div style={{ background: '#FEF2F2', padding: '0.6rem', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
                            <span style={{ fontSize: '0.7rem', color: '#B91C1C', display: 'block', fontWeight: 600 }}>Total Deductions</span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#991B1B' }}>₹ {previewCalc.deductions.toLocaleString('en-IN')}</span>
                          </div>

                          <div style={{ background: '#EEF2FF', padding: '0.6rem', borderRadius: '8px', border: '1px solid #C7D2FE' }}>
                            <span style={{ fontSize: '0.7rem', color: '#4338CA', display: 'block', fontWeight: 600 }}>Estimated Net Pay</span>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#3730A3' }}>₹ {previewCalc.netPay.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Wizard Action Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <div>
                  {activeTab !== 'reg' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveTab(activeTab === 'work' ? 'rep' : 'reg')}
                      style={{ borderRadius: '10px' }}
                    >
                      ← Previous
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '10px' }}>
                    Cancel
                  </button>
                  {activeTab !== 'work' ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={(e) => handleNext(e, activeTab as 'reg' | 'rep')}
                      style={{ background: 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)', borderColor: '#E8873C', borderRadius: '10px' }}
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                      style={{ background: 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)', borderColor: '#E8873C', borderRadius: '10px' }}
                    >
                      {loading ? 'Saving Employee...' : 'Save Employee'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
