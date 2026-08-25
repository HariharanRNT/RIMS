import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '../../../api/client';
import {
  Calculator,
  CheckCircle,
  AlertCircle,
  History,
  Save,
  CreditCard
} from 'lucide-react';

interface EmployeeOption {
  id: number;
  name: string;
  employeeCode: string;
  departmentName?: string;
  designationName?: string;
  email?: string;
}

interface SalaryComponentDto {
  id?: number;
  componentName: string;
  componentType: number;
  calculationType: number;
  percentage: number | null;
  fixedAmount: number | null;
  calculationBase: number | null;
  monthlyAmount: number;
  isEarning: boolean;
  isDeduction: boolean;
  isEmployerContribution: boolean;
}

interface SalaryStructureResponseDto {
  id: number;
  employeeId: number;
  annualCTC: number;
  monthlyCTC: number;
  salaryConfigurationMode: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  pfApplicable: boolean;
  esiApplicable: boolean;
  professionalTaxApplicable: boolean;
  tdsApplicable: boolean;
  grossEarnings: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  estimatedNetPay: number;
  components: SalaryComponentDto[];
}

export const EmployeeSalaryStructurePage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Form State
  const [annualCTC, setAnnualCTC] = useState<string>('');
  const [salaryConfigMode, setSalaryConfigMode] = useState<'ConfigureLater' | 'ConfigureNow'>('ConfigureNow');
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);

  // Statutory Applicability Flags
  const [pfApplicable, setPfApplicable] = useState<boolean>(true);
  const [esiApplicable, setEsiApplicable] = useState<boolean>(true);
  const [ptApplicable, setPtApplicable] = useState<boolean>(true);
  const [tdsApplicable, setTdsApplicable] = useState<boolean>(false);

  // Earnings Configuration State
  const [basicCalcType, setBasicCalcType] = useState<number>(0);
  const [basicPct, setBasicPct] = useState<string>('80');
  const [basicFixed, setBasicFixed] = useState<string>('0');

  const [hraCalcType, setHraCalcType] = useState<number>(0);
  const [hraPct, setHraPct] = useState<string>('10');
  const [hraBase, setHraBase] = useState<number>(0);
  const [hraFixed, setHraFixed] = useState<string>('0');

  const [convCalcType, setConvCalcType] = useState<number>(0);
  const [convPct, setConvPct] = useState<string>('5');
  const [convFixed, setConvFixed] = useState<string>('0');

  const [medCalcType, setMedCalcType] = useState<number>(0);
  const [medPct, setMedPct] = useState<string>('5');
  const [medFixed, setMedFixed] = useState<string>('0');

  const [arrearsFixed, setArrearsFixed] = useState<string>('0');

  const [specialCalcType, setSpecialCalcType] = useState<number>(2);
  const [specialPct, setSpecialPct] = useState<string>('0');
  const [specialFixed, setSpecialFixed] = useState<string>('0');

  // Employee Deductions Configuration State
  const [pfCalcType, setPfCalcType] = useState<number>(0);
  const [pfPct, setPfPct] = useState<string>('12');
  const [pfBase, setPfBase] = useState<number>(1);
  const [pfFixed, setPfFixed] = useState<string>('0');

  const [esiCalcType, setEsiCalcType] = useState<number>(0);
  const [esiPct, setEsiPct] = useState<string>('1');
  const [esiFixed, setEsiFixed] = useState<string>('0');

  const [ptFixed, setPtFixed] = useState<string>('200');
  const [tdsFixed, setTdsFixed] = useState<string>('0');
  const [otherDeductionName, setOtherDeductionName] = useState<string>('');
  const [otherDeductionFixed, setOtherDeductionFixed] = useState<string>('0');

  const [history, setHistory] = useState<SalaryStructureResponseDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Employee Dropdown Items
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await apiClient.get('/employees?pageSize=300');
      if (res.data.success) {
        setEmployees(res.data.data.items);
      }
    } catch {
      // Ignore error
    } finally {
      setLoadingEmployees(false);
    }
  };

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === Number(selectedEmployeeId));
  }, [employees, selectedEmployeeId]);

  // Load Salary Structure when Employee changes
  useEffect(() => {
    if (!selectedEmployeeId) {
      resetForm();
      setHistory([]);
      return;
    }
    fetchSalaryStructure(Number(selectedEmployeeId));
  }, [selectedEmployeeId]);

  const resetForm = () => {
    setAnnualCTC('');
    setSalaryConfigMode('ConfigureNow');
    setSalaryEffectiveFrom(new Date().toISOString().split('T')[0]);
    setPfApplicable(true);
    setEsiApplicable(true);
    setPtApplicable(true);
    setTdsApplicable(false);

    setBasicCalcType(0);
    setBasicPct('80');
    setBasicFixed('0');

    setHraCalcType(0);
    setHraPct('10');
    setHraBase(0);
    setHraFixed('0');

    setConvCalcType(0);
    setConvPct('5');
    setConvFixed('0');

    setMedCalcType(0);
    setMedPct('5');
    setMedFixed('0');

    setArrearsFixed('0');

    setSpecialCalcType(2);
    setSpecialPct('0');
    setSpecialFixed('0');

    setPfCalcType(0);
    setPfPct('12');
    setPfBase(1);
    setPfFixed('0');

    setEsiCalcType(0);
    setEsiPct('1');
    setEsiFixed('0');

    setPtFixed('200');
    setTdsFixed('0');
    setOtherDeductionName('');
    setOtherDeductionFixed('0');

    setErrorMsg('');
    setSuccessMsg('');
  };

  const fetchSalaryStructure = async (empId: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const [structRes, histRes] = await Promise.all([
        apiClient.get(`/employees/${empId}/salary-structure`),
        apiClient.get(`/employees/${empId}/salary-history`),
      ]);

      if (structRes.data.success && structRes.data.data) {
        populateForm(structRes.data.data);
      } else {
        resetForm();
      }

      if (histRes.data.success && histRes.data.data) {
        setHistory(histRes.data.data);
      } else {
        setHistory([]);
      }
    } catch {
      resetForm();
    }
  };

  const populateForm = (data: SalaryStructureResponseDto) => {
    setAnnualCTC(data.annualCTC ? data.annualCTC.toString() : '');
    setSalaryConfigMode(data.salaryConfigurationMode === 1 ? 'ConfigureNow' : 'ConfigureLater');
    setSalaryEffectiveFrom(data.effectiveFrom ? data.effectiveFrom.split('T')[0] : new Date().toISOString().split('T')[0]);

    setPfApplicable(data.pfApplicable ?? true);
    setEsiApplicable(data.esiApplicable ?? true);
    setPtApplicable(data.professionalTaxApplicable ?? true);
    setTdsApplicable(data.tdsApplicable ?? false);

    if (data.components && data.components.length > 0) {
      data.components.forEach((c) => {
        if (c.componentType === 0) {
          setBasicCalcType(c.calculationType);
          if (c.calculationType === 0) setBasicPct((c.percentage ?? 80).toString());
          else setBasicFixed((c.fixedAmount ?? 0).toString());
        } else if (c.componentType === 1) {
          setHraCalcType(c.calculationType);
          if (c.calculationType === 0) {
            setHraPct((c.percentage ?? 10).toString());
            setHraBase(c.calculationBase ?? 0);
          } else {
            setHraFixed((c.fixedAmount ?? 0).toString());
          }
        } else if (c.componentType === 2) {
          setConvCalcType(c.calculationType);
          if (c.calculationType === 0) setConvPct((c.percentage ?? 5).toString());
          else setConvFixed((c.fixedAmount ?? 0).toString());
        } else if (c.componentType === 3) {
          setMedCalcType(c.calculationType);
          if (c.calculationType === 0) setMedPct((c.percentage ?? 5).toString());
          else setMedFixed((c.fixedAmount ?? 0).toString());
        } else if (c.componentType === 4) {
          setSpecialCalcType(c.calculationType);
          if (c.calculationType === 0) setSpecialPct((c.percentage ?? 0).toString());
          else if (c.calculationType === 1) setSpecialFixed((c.fixedAmount ?? 0).toString());
        } else if (c.componentType === 5) {
          setArrearsFixed((c.fixedAmount ?? 0).toString());
        } else if (c.componentType === 6) {
          setPfCalcType(c.calculationType);
          if (c.calculationType === 0) {
            setPfPct((c.percentage ?? 12).toString());
            setPfBase(c.calculationBase ?? 1);
          } else {
            setPfFixed((c.fixedAmount ?? 0).toString());
          }
        } else if (c.componentType === 7) {
          setEsiCalcType(c.calculationType);
          if (c.calculationType === 0) setEsiPct((c.percentage ?? 1).toString());
          else setEsiFixed((c.fixedAmount ?? 0).toString());
        } else if (c.componentType === 8) {
          setPtFixed((c.fixedAmount ?? 200).toString());
        } else if (c.componentType === 9) {
          setTdsFixed((c.fixedAmount ?? 0).toString());
        } else if (c.componentType === 10) {
          setOtherDeductionName(c.componentName || 'Other Deduction');
          setOtherDeductionFixed((c.fixedAmount ?? 0).toString());
        }
      });
    }
  };

  const handleNonNegativeChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

  const monthlyCTC = useMemo(() => {
    const safeAnnual = Math.max(0, parseFloat(annualCTC) || 0);
    return Math.round((safeAnnual / 12) * 100) / 100;
  }, [annualCTC]);

  // Live Structure Breakdown Calculation
  const previewCalc = useMemo(() => {
    if (!annualCTC || monthlyCTC <= 0) {
      return {
        basic: 0,
        hra: 0,
        conv: 0,
        med: 0,
        special: 0,
        arrears: 0,
        gross: 0,
        pf: 0,
        esi: 0,
        pt: 0,
        tds: 0,
        other: 0,
        deductions: 0,
        netPay: 0,
        error: '',
      };
    }

    const safeBasicPct = Math.max(0, parseFloat(basicPct) || 0);
    const safeBasicFixed = Math.max(0, parseFloat(basicFixed) || 0);
    const safeHraPct = Math.max(0, parseFloat(hraPct) || 0);
    const safeHraFixed = Math.max(0, parseFloat(hraFixed) || 0);
    const safeConvPct = Math.max(0, parseFloat(convPct) || 0);
    const safeConvFixed = Math.max(0, parseFloat(convFixed) || 0);
    const safeMedPct = Math.max(0, parseFloat(medPct) || 0);
    const safeMedFixed = Math.max(0, parseFloat(medFixed) || 0);
    const safeArrearsFixed = Math.max(0, parseFloat(arrearsFixed) || 0);
    const safeSpecialPct = Math.max(0, parseFloat(specialPct) || 0);
    const safeSpecialFixed = Math.max(0, parseFloat(specialFixed) || 0);

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

    return {
      basic: b,
      hra: h,
      conv: c,
      med: m,
      special: s,
      arrears: arr,
      gross,
      pf: pfAmt,
      esi: esiAmt,
      pt: ptAmt,
      tds: tdsAmt,
      other: otherAmt,
      deductions: totalDeductions,
      netPay: net,
      error: autoErr,
    };
  }, [
    monthlyCTC,
    basicCalcType,
    basicPct,
    basicFixed,
    hraCalcType,
    hraPct,
    hraBase,
    hraFixed,
    convCalcType,
    convPct,
    convFixed,
    medCalcType,
    medPct,
    medFixed,
    arrearsFixed,
    specialCalcType,
    specialPct,
    specialFixed,
    pfApplicable,
    pfCalcType,
    pfPct,
    pfBase,
    pfFixed,
    esiApplicable,
    esiCalcType,
    esiPct,
    esiFixed,
    ptApplicable,
    ptFixed,
    tdsApplicable,
    tdsFixed,
    otherDeductionFixed,
    annualCTC,
  ]);

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
        isEmployerContribution: false,
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
        isEmployerContribution: false,
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
        isEmployerContribution: false,
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
        isEmployerContribution: false,
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
        isEmployerContribution: false,
      },
      ...(parseFloat(arrearsFixed) > 0
        ? [
            {
              componentName: 'Arrears',
              componentType: 5,
              calculationType: 1,
              percentage: null,
              fixedAmount: Math.max(0, parseFloat(arrearsFixed) || 0),
              calculationBase: null,
              monthlyAmount: previewCalc.arrears,
              isEarning: true,
              isDeduction: false,
              isEmployerContribution: false,
            },
          ]
        : []),
      ...(pfApplicable
        ? [
            {
              componentName: 'Provident Fund (PF)',
              componentType: 6,
              calculationType: pfCalcType,
              percentage: pfCalcType === 0 ? Math.max(0, parseFloat(pfPct) || 0) : null,
              fixedAmount: pfCalcType === 1 ? Math.max(0, parseFloat(pfFixed) || 0) : null,
              calculationBase: pfBase,
              monthlyAmount: previewCalc.pf,
              isEarning: false,
              isDeduction: true,
              isEmployerContribution: false,
            },
          ]
        : []),
      ...(esiApplicable
        ? [
            {
              componentName: 'Employee State Insurance (ESI)',
              componentType: 7,
              calculationType: esiCalcType,
              percentage: esiCalcType === 0 ? Math.max(0, parseFloat(esiPct) || 0) : null,
              fixedAmount: esiCalcType === 1 ? Math.max(0, parseFloat(esiFixed) || 0) : null,
              calculationBase: 0,
              monthlyAmount: previewCalc.esi,
              isEarning: false,
              isDeduction: true,
              isEmployerContribution: false,
            },
          ]
        : []),
      ...(ptApplicable
        ? [
            {
              componentName: 'Professional Tax',
              componentType: 8,
              calculationType: 1,
              percentage: null,
              fixedAmount: Math.max(0, parseFloat(ptFixed) || 0),
              calculationBase: null,
              monthlyAmount: previewCalc.pt,
              isEarning: false,
              isDeduction: true,
              isEmployerContribution: false,
            },
          ]
        : []),
      ...(tdsApplicable
        ? [
            {
              componentName: 'TDS',
              componentType: 9,
              calculationType: 1,
              percentage: null,
              fixedAmount: Math.max(0, parseFloat(tdsFixed) || 0),
              calculationBase: null,
              monthlyAmount: previewCalc.tds,
              isEarning: false,
              isDeduction: true,
              isEmployerContribution: false,
            },
          ]
        : []),
      ...(parseFloat(otherDeductionFixed) > 0
        ? [
            {
              componentName: otherDeductionName || 'Other Deduction',
              componentType: 10,
              calculationType: 1,
              percentage: null,
              fixedAmount: Math.max(0, parseFloat(otherDeductionFixed) || 0),
              calculationBase: null,
              monthlyAmount: previewCalc.other,
              isEarning: false,
              isDeduction: true,
              isEmployerContribution: false,
            },
          ]
        : []),
    ];
  };

  const handleSaveSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setErrorMsg('Please select an employee first.');
      return;
    }

    const ctcVal = Math.max(0, parseFloat(annualCTC) || 0);
    if (!annualCTC || ctcVal <= 0) {
      setErrorMsg('Please enter a valid positive Annual CTC.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        annualCTC: ctcVal,
        salaryConfigurationMode: salaryConfigMode === 'ConfigureNow' ? 1 : 0,
        effectiveFrom: salaryEffectiveFrom,
        pfApplicable,
        esiApplicable,
        professionalTaxApplicable: ptApplicable,
        tdsApplicable,
        components: buildSalaryComponentsPayload(),
      };

      const res = await apiClient.post(`/employees/${selectedEmployeeId}/salary-structure`, payload);

      if (res.data.success) {
        setSuccessMsg(`Salary structure saved successfully for ${selectedEmployee?.name || 'Employee'}.`);
        fetchSalaryStructure(Number(selectedEmployeeId));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save salary structure. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calculator size={26} style={{ color: '#E8873C' }} />
            <span>Employee Salary Structure</span>
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Configure CTC breakdown, statutory applicability (PF, ESI, PT, TDS), earnings, and deductions for payslip generation.
          </p>
        </div>
      </div>

      {/* Card 1: Employee Selection Bar */}
      <div className="ui-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>
              Select Employee <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className="form-select"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                }}
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '')}
                disabled={loadingEmployees}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode}) {emp.departmentName ? `- ${emp.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Employee Info Banner */}
          {selectedEmployee ? (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                  {selectedEmployee.name} <span style={{ fontSize: '0.8rem', color: '#E8873C', fontWeight: 600 }}>({selectedEmployee.employeeCode})</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.15rem' }}>
                  {selectedEmployee.departmentName || 'No Dept'} • {selectedEmployee.designationName || 'No Designation'}
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '6px', fontWeight: 600 }}>
                Active Profile
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: '#6b7280', fontStyle: 'italic' }}>
              Select an employee to manage or create their salary structure.
            </div>
          )}
        </div>
      </div>

      {/* Main Configuration Form Card */}
      {selectedEmployeeId ? (
        <form onSubmit={handleSaveSalaryStructure} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.85rem 1.15rem', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '10px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '0.85rem 1.15rem', background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46', borderRadius: '10px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="ui-card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div style={{ padding: '0.75rem 1rem', background: '#fff4e6', border: '1px solid #ffe8d1', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} style={{ color: '#E8873C' }} />
              <span>Payroll & Salary Details</span>
            </div>

            {/* Basic CTC Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>
                  Annual CTC (₹) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className="form-input"
                  style={{ borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700, width: '100%' }}
                  value={annualCTC}
                  onKeyDown={handleKeyDownNonNegative}
                  onChange={handleNonNegativeChange(setAnnualCTC)}
                  placeholder="e.g. 400000"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>
                  Monthly CTC (Derived)
                </label>
                <input
                  type="text"
                  disabled
                  className="form-input"
                  style={{ borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700, backgroundColor: '#f3f4f6', color: '#111827', width: '100%' }}
                  value={monthlyCTC ? `₹ ${monthlyCTC.toLocaleString('en-IN')}` : '₹ 0.00'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>
                  Salary Effective From <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ borderRadius: '10px', fontSize: '0.875rem', width: '100%' }}
                  value={salaryEffectiveFrom}
                  onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Salary Structure Mode */}
            <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontWeight: 700, color: '#111827', fontSize: '0.825rem', display: 'block', marginBottom: '0.5rem' }}>
                Salary Structure Mode
              </label>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="salaryConfigMode"
                    value="ConfigureLater"
                    checked={salaryConfigMode === 'ConfigureLater'}
                    onChange={() => setSalaryConfigMode('ConfigureLater')}
                  />
                  <span>Configure Later (Basic CTC setup only)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Statutory Applicability Flags */}
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', padding: '0.75rem 1rem', background: '#eef2ff', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={pfApplicable} onChange={(e) => setPfApplicable(e.target.checked)} />
                    <span>PF Applicable</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={esiApplicable} onChange={(e) => setEsiApplicable(e.target.checked)} />
                    <span>ESI Applicable</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={ptApplicable} onChange={(e) => setPtApplicable(e.target.checked)} />
                    <span>Professional Tax</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={tdsApplicable} onChange={(e) => setTdsApplicable(e.target.checked)} />
                    <span>TDS Applicable</span>
                  </label>
                </div>

                {/* Earnings Configuration Table */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: '#111827', borderBottom: '1px solid #e2e8f0' }}>
                    💵 Earnings Configuration
                  </div>
                  <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Basic Salary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Basic Salary</span>
                      <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={basicCalcType} onChange={(e) => setBasicCalcType(Number(e.target.value))}>
                        <option value={0}>Percentage (%)</option>
                        <option value={1}>Fixed Amount</option>
                      </select>
                      {basicCalcType === 0 ? (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={basicPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setBasicPct)} placeholder="%" />
                      ) : (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={basicFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setBasicFixed)} placeholder="₹" />
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Base: Monthly CTC</span>
                      <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.basic.toLocaleString('en-IN')}</span>
                    </div>

                    {/* HRA */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>HRA</span>
                      <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={hraCalcType} onChange={(e) => setHraCalcType(Number(e.target.value))}>
                        <option value={0}>Percentage (%)</option>
                        <option value={1}>Fixed Amount</option>
                      </select>
                      {hraCalcType === 0 ? (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={hraPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setHraPct)} placeholder="%" />
                      ) : (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={hraFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setHraFixed)} placeholder="₹" />
                      )}
                      {hraCalcType === 0 ? (
                        <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.75rem' }} value={hraBase} onChange={(e) => setHraBase(Number(e.target.value))}>
                          <option value={1}>Basic Salary</option>
                          <option value={0}>Monthly CTC</option>
                        </select>
                      ) : (
                        <span />
                      )}
                      <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.hra.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Conveyance */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Conveyance</span>
                      <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={convCalcType} onChange={(e) => setConvCalcType(Number(e.target.value))}>
                        <option value={0}>Percentage (%)</option>
                        <option value={1}>Fixed Amount</option>
                      </select>
                      {convCalcType === 0 ? (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={convPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setConvPct)} placeholder="%" />
                      ) : (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={convFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setConvFixed)} placeholder="₹" />
                      )}
                      <span />
                      <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.conv.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Medical Allowance */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Medical Allowance</span>
                      <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={medCalcType} onChange={(e) => setMedCalcType(Number(e.target.value))}>
                        <option value={0}>Percentage (%)</option>
                        <option value={1}>Fixed Amount</option>
                      </select>
                      {medCalcType === 0 ? (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={medPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setMedPct)} placeholder="%" />
                      ) : (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={medFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setMedFixed)} placeholder="₹" />
                      )}
                      <span />
                      <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.med.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Arrears */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Arrears</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fixed Amount</span>
                      <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={arrearsFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setArrearsFixed)} placeholder="₹" />
                      <span />
                      <span style={{ fontWeight: 700, color: '#059669', textAlign: 'right' }}>₹ {previewCalc.arrears.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Special Allowance */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Special Allowance</span>
                      <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={specialCalcType} onChange={(e) => setSpecialCalcType(Number(e.target.value))}>
                        <option value={2}>Auto Balance</option>
                        <option value={0}>Percentage (%)</option>
                        <option value={1}>Fixed Amount</option>
                      </select>
                      {specialCalcType === 2 ? (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Auto calculated</span>
                      ) : specialCalcType === 0 ? (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={specialPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setSpecialPct)} placeholder="%" />
                      ) : (
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={specialFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setSpecialFixed)} placeholder="₹" />
                      )}
                      <span />
                      <span style={{ fontWeight: 700, color: previewCalc.special < 0 ? '#ef4444' : '#059669', textAlign: 'right' }}>
                        ₹ {previewCalc.special.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employee Deductions Configuration Table */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: '#111827', borderBottom: '1px solid #e2e8f0' }}>
                    🔻 Employee Deductions Configuration
                  </div>
                  <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pfApplicable && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>Employee PF</span>
                        <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={pfCalcType} onChange={(e) => setPfCalcType(Number(e.target.value))}>
                          <option value={0}>Percentage (%)</option>
                          <option value={1}>Fixed Amount</option>
                        </select>
                        {pfCalcType === 0 ? (
                          <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={pfPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setPfPct)} placeholder="%" />
                        ) : (
                          <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={pfFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setPfFixed)} placeholder="₹" />
                        )}
                        {pfCalcType === 0 ? (
                          <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.75rem' }} value={pfBase} onChange={(e) => setPfBase(Number(e.target.value))}>
                            <option value={1}>Basic Salary</option>
                            <option value={0}>Monthly CTC</option>
                          </select>
                        ) : (
                          <span />
                        )}
                        <span style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>₹ {previewCalc.pf.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {esiApplicable && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>Employee ESI</span>
                        <select className="form-select" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={esiCalcType} onChange={(e) => setEsiCalcType(Number(e.target.value))}>
                          <option value={0}>Percentage (%)</option>
                          <option value={1}>Fixed Amount</option>
                        </select>
                        {esiCalcType === 0 ? (
                          <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={esiPct} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setEsiPct)} placeholder="%" />
                        ) : (
                          <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={esiFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setEsiFixed)} placeholder="₹" />
                        )}
                        <span />
                        <span style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>₹ {previewCalc.esi.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {ptApplicable && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>Professional Tax</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fixed Amount</span>
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={ptFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setPtFixed)} placeholder="₹" />
                        <span />
                        <span style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>₹ {previewCalc.pt.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {tdsApplicable && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>TDS</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fixed Amount</span>
                        <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={tdsFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setTdsFixed)} placeholder="₹" />
                        <span />
                        <span style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>₹ {previewCalc.tds.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 110px 110px 1fr', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}
                        value={otherDeductionName}
                        onChange={(e) => setOtherDeductionName(e.target.value)}
                        placeholder="Other Deduction Name"
                      />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Fixed Amount</span>
                      <input type="number" step="any" min={0} className="form-input" style={{ padding: '0.35rem', fontSize: '0.8rem' }} value={otherDeductionFixed} onKeyDown={handleKeyDownNonNegative} onChange={handleNonNegativeChange(setOtherDeductionFixed)} placeholder="₹" />
                      <span />
                      <span style={{ fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>₹ {previewCalc.other.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Live Salary Preview Cards */}
                <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calculator size={16} style={{ color: '#E8873C' }} />
                    <span>Live Salary Structure Preview</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '0.85rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600, display: 'block' }}>Total Gross Earnings</span>
                      <span style={{ fontSize: '1.15rem', color: '#065f46', fontWeight: 800 }}>₹ {previewCalc.gross.toLocaleString('en-IN')}</span>
                    </div>

                    <div style={{ padding: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600, display: 'block' }}>Total Deductions</span>
                      <span style={{ fontSize: '1.15rem', color: '#991b1b', fontWeight: 800 }}>₹ {previewCalc.deductions.toLocaleString('en-IN')}</span>
                    </div>

                    <div style={{ padding: '0.85rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600, display: 'block' }}>Estimated Net Pay</span>
                      <span style={{ fontSize: '1.15rem', color: '#1e40af', fontWeight: 800 }}>₹ {previewCalc.netPay.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.75rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Save size={18} />
                <span>{saving ? 'Saving Structure...' : 'Save Salary Structure'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {/* Revision History Card */}
      {selectedEmployeeId && history.length > 0 && (
        <div className="ui-card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <History size={20} style={{ color: '#E8873C' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
              Salary Revision History
            </h3>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 1rem' }}>Effective From</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Annual CTC</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Monthly CTC</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Gross Earnings</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Net Pay</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{h.effectiveFrom ? h.effectiveFrom.split('T')[0] : 'N/A'}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>₹ {h.annualCTC ? h.annualCTC.toLocaleString('en-IN') : 0}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>₹ {h.monthlyCTC ? h.monthlyCTC.toLocaleString('en-IN') : 0}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#059669', fontWeight: 600 }}>₹ {h.grossEarnings ? h.grossEarnings.toLocaleString('en-IN') : 0}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#1d4ed8', fontWeight: 700 }}>₹ {h.estimatedNetPay ? h.estimatedNetPay.toLocaleString('en-IN') : 0}</td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {h.isActive ? (
                        <span style={{ padding: '0.2rem 0.5rem', background: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Active Current
                        </span>
                      ) : (
                        <span style={{ padding: '0.2rem 0.5rem', background: '#f3f4f6', color: '#6b7280', borderRadius: '6px', fontSize: '0.75rem' }}>
                          Historical
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
