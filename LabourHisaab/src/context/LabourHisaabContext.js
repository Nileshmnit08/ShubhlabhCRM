// LabourHisaab Central Application Context
// Implements LH-LEDGER-01: Full ledger integration, work allocations with exact penny rounding,
// rate snapshotting, CRUD operations, idempotent submissions, and daily/monthly reconciliations.

import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  DEFAULT_WORK_RATES,
  INITIAL_LABOURERS,
} from '../constants/initialData';
import { todayYmd } from '../utils/dates';
import {
  calculateDailyMetrics,
  calculateLabourerStatement,
  calculatePeriodReport,
  calculateWorkEntry,
} from '../utils/calculations';
import {
  distributeWorkAllocation,
  distributeExpenseDeduction,
  labourDatabaseService,
} from '../services/LabourDatabaseService';

const LabourHisaabContext = createContext(null);

export function LabourHisaabProvider({ children }) {
  // Application Data States
  const [labourers, setLabourers] = useState(INITIAL_LABOURERS);
  const [workRates, setWorkRates] = useState(DEFAULT_WORK_RATES);
  // LH-HOME-TOTAL-DATE-01: the app starts with no sample work, payments or expenses, so
  // demo amounts (e.g. the old ₹5,808 day) are never shown as live data. The sample
  // labourer roster is kept until the persistence sprint (there is no storage yet).
  const [workEntries, setWorkEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [serviceExpenses, setServiceExpenses] = useState([]);

  // Global filters
  // The device's real date, not the fixed demo date (TODAY_DATE).
  const [selectedDate, setSelectedDate] = useState(() => todayYmd());
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [contractorName, setContractorName] = useState('शुभ लाभ लेबर कांट्रेक्टर');

  // UI state tracking
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // -------------------------------------------------------------
  // 1. LABOURER CRUD OPERATIONS (Preserve Stable Local IDs)
  // -------------------------------------------------------------
  const addLabourer = ({ name, phone = '', role = 'सामान्य मजदूर', notes = '' }) => {
    if (!name || !name.trim()) throw new Error('मजदूर का नाम आवश्यक है।');
    const nextNum = labourers.length + 1;
    const newId = `LH_LAB_${String(nextNum).padStart(3, '0')}`;
    const newLabourer = {
      id: newId,
      name: name.trim(),
      phone: phone.trim(),
      role: role.trim(),
      notes: notes.trim(),
      joinDate: selectedDate,
      isActive: true,
      avatarColor: ['#F28C28', '#137A38', '#2563EB', '#9333EA', '#D97706'][nextNum % 5],
    };

    setLabourers(prev => [...prev, newLabourer]);
    labourDatabaseService.addLabourer(newLabourer).catch(() => {});
    return newLabourer;
  };

  const renameLabourer = (id, newName) => {
    if (!newName || !newName.trim()) return false;
    setLabourers(prev =>
      prev.map(lab => (lab.id === id ? { ...lab, name: newName.trim() } : lab))
    );
    labourDatabaseService.renameLabourer(id, newName).catch(() => {});
    return true;
  };

  const toggleLabourerStatus = (id) => {
    setLabourers(prev =>
      prev.map(lab => (lab.id === id ? { ...lab, isActive: !lab.isActive } : lab))
    );
    labourDatabaseService.toggleLabourerActive(id).catch(() => {});
  };

  const updateLabourer = (id, updates) => {
    setLabourers(prev =>
      prev.map(lab => (lab.id === id ? { ...lab, ...updates } : lab))
    );
  };

  // -------------------------------------------------------------
  // 2. RATE REVISION OPERATIONS (Immutable Historical Snapshots)
  // -------------------------------------------------------------
  const updateWorkRate = (rateId, newRate, newUnit = null) => {
    setWorkRates(prev =>
      prev.map(r => {
        if (r.id === rateId) {
          const updatedRate = Number(newRate) || r.rate;
          const updatedUnit = newUnit || r.unit;
          let unitLabel = r.unitLabel;
          let unitShort = r.unitShort;

          if (updatedUnit === 'per_100_kg') {
            unitLabel = `₹${updatedRate} / 100 kg`;
            unitShort = '/ 100 kg';
          } else if (updatedUnit === 'per_bag') {
            unitLabel = `₹${updatedRate} / बैग`;
            unitShort = '/ बैग';
          } else if (updatedUnit === 'per_batch') {
            unitLabel = `₹${updatedRate} / बैच`;
            unitShort = '/ बैच';
          } else if (updatedUnit === 'fixed') {
            unitLabel = `₹${updatedRate} फिक्स`;
            unitShort = 'fixed';
          }

          return {
            ...r,
            rate: updatedRate,
            unit: updatedUnit,
            unitLabel,
            unitShort,
          };
        }
        return r;
      })
    );
    labourDatabaseService.reviseWorkRate(rateId, newRate, newUnit).catch(() => {});
    return true;
  };

  const resetWorkRates = () => {
    setWorkRates(DEFAULT_WORK_RATES);
  };

  // -------------------------------------------------------------
  // 3. DAILY WORK ENTRY & ALLOCATION OPERATIONS
  // -------------------------------------------------------------
  const addWorkEntry = (entryData) => {
    const rateInfo = workRates.find(r => r.id === entryData.categoryId) || {
      rate: entryData.rate || 0,
      unit: entryData.unit || 'per_100_kg',
      type: entryData.type || 'weight',
      name: entryData.categoryName || 'General Work',
    };

    const calculated = calculateWorkEntry({
      rate: entryData.rate ?? rateInfo.rate,
      unit: rateInfo.unit,
      type: rateInfo.type,
      bagLines: entryData.bagLines || [],
      totalBags: entryData.totalBags || 0,
      totalBatches: entryData.totalBatches || 0,
      fixedAmount: entryData.fixedAmount, // undefined = use the rate; 0 stays 0
    });

    const participants = entryData.participatingLabourerIds || [];
    const allocations = distributeWorkAllocation(calculated.totalAmount, participants);

    const newEntry = {
      id: entryData.id || `WE_${Date.now()}`,
      date: entryData.date || selectedDate,
      categoryId: entryData.categoryId,
      categoryName: rateInfo.name,
      rate: calculated.rate,
      unit: calculated.unit,
      type: calculated.type,
      bagLines: calculated.bagLines,
      totalBags: calculated.totalBags,
      totalKg: calculated.totalKg,
      totalBatches: calculated.totalBatches,
      totalAmount: calculated.totalAmount,
      notes: entryData.notes || '',
      participatingLabourerIds: participants,
      allocations, // Store calculated allocations directly
      createdAt: new Date().toISOString(),
    };

    setWorkEntries(prev => [newEntry, ...prev]);

    // Sync to backing service
    labourDatabaseService.saveWorkEntry({
      ...newEntry,
      rate: calculated.rate,
      unit: calculated.unit,
      type: calculated.type,
    }).catch(() => {});

    return newEntry;
  };

  const updateWorkEntry = (id, updates) => {
    setWorkEntries(prev =>
      prev.map(entry => {
        if (entry.id !== id) return entry;

        const merged = { ...entry, ...updates };
        const calculated = calculateWorkEntry({
          rate: merged.rate,
          unit: merged.unit,
          type: merged.type,
          bagLines: merged.bagLines || [],
          totalBags: merged.totalBags || 0,
          totalBatches: merged.totalBatches || 0,
          fixedAmount: updates.totalAmount ?? merged.totalAmount,
        });

        const participants = merged.participatingLabourerIds || [];
        const allocations = distributeWorkAllocation(calculated.totalAmount, participants);

        const updated = {
          ...merged,
          totalBags: calculated.totalBags,
          totalKg: calculated.totalKg,
          totalBatches: calculated.totalBatches,
          totalAmount: calculated.totalAmount,
          allocations,
          updatedAt: new Date().toISOString(),
        };

        labourDatabaseService.updateWorkEntry(id, updated).catch(() => {});
        return updated;
      })
    );
  };

  const deleteWorkEntry = (id) => {
    setWorkEntries(prev => prev.filter(e => e.id !== id));
    labourDatabaseService.deleteWorkEntry(id).catch(() => {});
  };

  // -------------------------------------------------------------
  // 4. DAILY PAYMENT OPERATIONS (Cash, Other, Partial, Advance)
  // -------------------------------------------------------------
  const addPayment = ({ date, labourerId, amount, paymentMethod = 'Cash', notes = '' }) => {
    const lab = labourers.find(l => l.id === labourerId);
    const newPayment = {
      id: `PAY_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: date || selectedDate,
      labourerId,
      labourerName: lab ? lab.name : 'Unknown',
      amount: Number(amount) || 0,
      paymentMethod,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setPayments(prev => [newPayment, ...prev]);
    labourDatabaseService.savePayment(newPayment).catch(() => {});
    return newPayment;
  };

  const addBulkPayments = ({ date, paymentItems = [] }) => {
    const newPayments = paymentItems.map((item, idx) => {
      const lab = labourers.find(l => l.id === item.labourerId);
      return {
        id: `PAY_${Date.now()}_${idx}`,
        date: date || selectedDate,
        labourerId: item.labourerId,
        labourerName: lab ? lab.name : 'Unknown',
        amount: Number(item.amount) || 0,
        paymentMethod: item.paymentMethod || 'Cash',
        notes: (item.notes || '').trim(),
        createdAt: new Date().toISOString(),
      };
    });

    setPayments(prev => [...newPayments, ...prev]);
    newPayments.forEach(p => labourDatabaseService.savePayment(p).catch(() => {}));
    return newPayments;
  };

  const updatePayment = (id, updates) => {
    setPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
    labourDatabaseService.updatePayment(id, updates).catch(() => {});
  };

  const deletePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
    labourDatabaseService.deletePayment(id).catch(() => {});
  };

  // -------------------------------------------------------------
  // 5. SERVICE EXPENSE OPERATIONS (Contractor vs Deductions)
  // -------------------------------------------------------------
  const addServiceExpense = ({
    date,
    category = 'tea_breakfast',
    expenseName,
    amount,
    description = '',
    allocationType = 'contractor_expense',
    allocatedLabourerIds = [],
  }) => {
    const numericAmount = Number(amount) || 0;
    const deductions = distributeExpenseDeduction(numericAmount, allocationType, allocatedLabourerIds);

    const newExpense = {
      id: `EXP_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: date || selectedDate,
      category,
      expenseName: expenseName.trim(),
      amount: numericAmount,
      description: description.trim(),
      allocationType,
      allocatedLabourerIds: allocationType === 'contractor_expense' ? [] : allocatedLabourerIds,
      deductions,
      createdAt: new Date().toISOString(),
    };

    setServiceExpenses(prev => [newExpense, ...prev]);
    labourDatabaseService.saveServiceExpense(newExpense).catch(() => {});
    return newExpense;
  };

  const updateServiceExpense = (id, updates) => {
    setServiceExpenses(prev =>
      prev.map(exp => {
        if (exp.id !== id) return exp;
        const merged = { ...exp, ...updates };
        const deductions = distributeExpenseDeduction(
          Number(merged.amount) || 0,
          merged.allocationType,
          merged.allocatedLabourerIds || []
        );
        return { ...merged, deductions, updatedAt: new Date().toISOString() };
      })
    );
  };

  const deleteServiceExpense = (id) => {
    setServiceExpenses(prev => prev.filter(e => e.id !== id));
    labourDatabaseService.deleteServiceExpense(id).catch(() => {});
  };

  // -------------------------------------------------------------
  // 6. CALCULATED LEDGER SELECTORS (Reconciled from Saved Records)
  // -------------------------------------------------------------
  const todayMetrics = useMemo(() => {
    return calculateDailyMetrics({
      date: selectedDate,
      workEntries,
      payments,
      serviceExpenses,
      labourers,
    });
  }, [selectedDate, workEntries, payments, serviceExpenses, labourers]);

  // Consolidated Daily Ledger for Selected Date
  const getDailyLedger = (date = selectedDate) => {
    const dayWork = workEntries.filter(e => e.date === date);
    const dayPayments = payments.filter(p => p.date === date);
    const dayExpenses = serviceExpenses.filter(e => e.date === date);

    const totalLabourEarned = dayWork.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
    const totalPayments = dayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    let totalServiceExpenses = 0;
    let contractorExpenses = 0;
    let allocatedDeductions = 0;

    dayExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      totalServiceExpenses += amt;
      if (exp.allocationType === 'contractor_expense') {
        contractorExpenses += amt;
      } else {
        allocatedDeductions += amt;
      }
    });

    const remainingPayableToday = Math.round(
      (totalLabourEarned - totalPayments - allocatedDeductions) * 100
    ) / 100;

    // Build labourer-wise entries for this date
    const labourerLedger = labourers.map(lab => {
      // Labourer earned allocations for this date
      let earned = 0;
      dayWork.forEach(entry => {
        const participants = entry.participatingLabourerIds || [];
        if (participants.includes(lab.id)) {
          const share = (entry.allocations?.find(a => a.labourerId === lab.id)?.allocatedAmount)
            || (Number(entry.totalAmount) / (participants.length || 1));
          earned += share;
        }
      });

      // Labourer payments on this date
      const paid = dayPayments
        .filter(p => p.labourerId === lab.id)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Labourer deductions on this date
      let deductions = 0;
      dayExpenses.forEach(exp => {
        if (exp.allocationType !== 'contractor_expense' && (exp.allocatedLabourerIds || []).includes(lab.id)) {
          const ded = (exp.deductions?.find(d => d.labourerId === lab.id)?.deductionAmount)
            || (exp.allocationType === 'individual'
              ? Number(exp.amount)
              : Number(exp.amount) / ((exp.allocatedLabourerIds || []).length || 1));
          deductions += ded;
        }
      });

      const remainingBalance = Math.round((earned - paid - deductions) * 100) / 100;

      return {
        labourerId: lab.id,
        labourerName: lab.name,
        labourerPhone: lab.phone,
        isActive: lab.isActive,
        date,
        earned: Math.round(earned * 100) / 100,
        paid: Math.round(paid * 100) / 100,
        deductions: Math.round(deductions * 100) / 100,
        remainingBalance,
      };
    });

    return {
      date,
      totalLabourEarned: Math.round(totalLabourEarned * 100) / 100,
      totalPayments: Math.round(totalPayments * 100) / 100,
      totalServiceExpenses: Math.round(totalServiceExpenses * 100) / 100,
      contractorExpenses: Math.round(contractorExpenses * 100) / 100,
      allocatedDeductions: Math.round(allocatedDeductions * 100) / 100,
      remainingPayableToday,
      labourerLedger,
      workEntries: dayWork,
      payments: dayPayments,
      serviceExpenses: dayExpenses,
    };
  };

  // Reconciled Monthly Summary from Saved Records
  const getMonthlySummary = (yearMonth = selectedMonth, targetLabourerId = null, sortBy = 'default', sortDirection = 'asc') => {
    const monthWork = workEntries.filter(e => (e.date || '').startsWith(yearMonth));
    const monthPayments = payments.filter(p => (p.date || '').startsWith(yearMonth));
    const monthExpenses = serviceExpenses.filter(e => (e.date || '').startsWith(yearMonth));

    const targetLabourers = targetLabourerId
      ? labourers.filter(l => l.id === targetLabourerId)
      : labourers;

    let overallEarned = 0;
    let overallPaid = 0;
    let overallDeductions = 0;
    let overallWeightKg = 0;
    const workingDaysSet = new Set();

    monthWork.forEach(e => {
      overallWeightKg += (Number(e.totalWeightKg || e.totalKg) || 0);
      workingDaysSet.add(e.date);
    });

    const individualSummaries = targetLabourers.map(lab => {
      const labWorkingDays = new Set();

      // Earned from allocations
      let labEarned = 0;
      monthWork.forEach(wEntry => {
        const participants = wEntry.participatingLabourerIds || [];
        if (participants.includes(lab.id)) {
          labWorkingDays.add(wEntry.date);
          const share = (wEntry.allocations?.find(a => a.labourerId === lab.id)?.allocatedAmount)
            || (Number(wEntry.totalAmount) / (participants.length || 1));
          labEarned += share;
        }
      });

      // Payments
      const labPaid = monthPayments
        .filter(p => {
          if (p.labourerId === lab.id) {
            labWorkingDays.add(p.date);
            return true;
          }
          return false;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Service Deductions
      let labDeductions = 0;
      monthExpenses.forEach(exp => {
        if (exp.allocationType !== 'contractor_expense' && (exp.allocatedLabourerIds || []).includes(lab.id)) {
          const ded = (exp.deductions?.find(d => d.labourerId === lab.id)?.deductionAmount)
            || (exp.allocationType === 'individual'
              ? Number(exp.amount)
              : Number(exp.amount) / ((exp.allocatedLabourerIds || []).length || 1));
          labDeductions += ded;
        }
      });

      const labBalance = Math.round((labEarned - labPaid - labDeductions) * 100) / 100;

      overallEarned += labEarned;
      overallPaid += labPaid;
      overallDeductions += labDeductions;

      return {
        labourerId: lab.id,
        labourerName: lab.name,
        labourerPhone: lab.phone,
        isActive: lab.isActive,
        yearMonth,
        workingDays: labWorkingDays.size,
        totalLabourEarned: Math.round(labEarned * 100) / 100,
        totalAmountPaid: Math.round(labPaid * 100) / 100,
        totalAllocatedServiceExpenses: Math.round(labDeductions * 100) / 100,
        remainingBalance: labBalance,
      };
    });

    const contractorExpenses = monthExpenses
      .filter(e => e.allocationType === 'contractor_expense')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalRemainingBalance = Math.round(
      (overallEarned - overallPaid - overallDeductions) * 100
    ) / 100;

    let sortedSummaries = [...individualSummaries];
    if (sortBy === 'name') {
      sortedSummaries.sort((a, b) => (a.labourerName || '').localeCompare(b.labourerName || '', 'hi'));
    } else if (sortBy === 'earned') {
      sortedSummaries.sort((a, b) => (b.totalLabourEarned || 0) - (a.totalLabourEarned || 0));
    } else if (sortBy === 'paid') {
      sortedSummaries.sort((a, b) => (b.totalAmountPaid || 0) - (a.totalAmountPaid || 0));
    } else if (sortBy === 'balance') {
      sortedSummaries.sort((a, b) => (b.remainingBalance || 0) - (a.remainingBalance || 0));
    }
    if (sortDirection === 'desc' && sortBy === 'name') {
      sortedSummaries.reverse();
    } else if (sortDirection === 'asc' && sortBy !== 'default' && sortBy !== 'name') {
      sortedSummaries.reverse();
    }

    return {
      yearMonth,
      targetLabourerId,
      totalWorkingDays: workingDaysSet.size,
      totalWeightProcessedKg: Math.round(overallWeightKg * 100) / 100,
      totalLabourEarned: Math.round(overallEarned * 100) / 100,
      totalPaymentsMade: Math.round(overallPaid * 100) / 100,
      totalAllocatedServiceExpenses: Math.round(overallDeductions * 100) / 100,
      contractorBorneExpenses: Math.round(contractorExpenses * 100) / 100,
      remainingPayableBalance: totalRemainingBalance,
      individualSummaries: sortedSummaries,
    };
  };

  const getDailyReport = (date = selectedDate) => {
    return labourDatabaseService.getDailyReport(date);
  };

  const getWeeklyReport = (params = {}) => {
    return labourDatabaseService.getWeeklyReport({
      referenceDate: selectedDate,
      ...params,
    });
  };

  const getPaymentLedger = (params = {}) => {
    return labourDatabaseService.getPaymentLedger({
      referenceDate: selectedDate,
      yearMonth: selectedMonth,
      ...params,
    });
  };

  const getServiceExpenseReport = (params = {}) => {
    return labourDatabaseService.getServiceExpenseReport({
      referenceDate: selectedDate,
      yearMonth: selectedMonth,
      ...params,
    });
  };

  const getLabourerStatementMemo = (labourerId, month = selectedMonth) => {
    return calculateLabourerStatement({
      labourerId,
      yearMonth: month,
      workEntries,
      payments,
      serviceExpenses,
      labourers,
    });
  };

  const getPeriodReportMemo = (filterType, refDate = selectedDate) => {
    return calculatePeriodReport({
      filterType,
      referenceDate: refDate,
      workEntries,
      payments,
      serviceExpenses,
      labourers,
    });
  };

  // -------------------------------------------------------------
  // 7. MONTHLY SETTLEMENT & ACCOUNT CLOSING (LH-SETTLEMENT-01)
  // -------------------------------------------------------------
  const getMonthlySettlementMemo = async (month = selectedMonth, targetLabourerId = null) => {
    return await labourDatabaseService.getMonthlySettlement(month, targetLabourerId);
  };

  const confirmSettlementStatusMemo = async (month = selectedMonth, newStatus, notes = '') => {
    return await labourDatabaseService.confirmSettlementStatus(month, newStatus, notes);
  };

  const closeMonthAndCarryForwardMemo = async (month = selectedMonth, closedBy = contractorName) => {
    return await labourDatabaseService.closeMonthAndCarryForward(month, closedBy);
  };

  const recordSettlementCorrectionMemo = async (params) => {
    return await labourDatabaseService.recordSettlementCorrection({
      ...params,
      correctedBy: contractorName,
    });
  };

  const getSettlementCorrectionsMemo = async (month = null) => {
    return await labourDatabaseService.getSettlementCorrections(month);
  };

  // -------------------------------------------------------------
  // 8. BACKUP, RESTORE & OFFLINE PERSISTENCE (LH-QA-01)
  // -------------------------------------------------------------
  const createBackup = async () => {
    return await labourDatabaseService.createBackup(contractorName);
  };

  const restoreBackup = async (backupPayload) => {
    const res = await labourDatabaseService.restoreBackup(backupPayload);
    // Sync React state with restored database service
    setLabourers([...labourDatabaseService.labourers]);
    setWorkRates([...labourDatabaseService.workRates]);
    setWorkEntries([...labourDatabaseService.workEntries]);
    setPayments([...labourDatabaseService.payments]);
    setServiceExpenses([...labourDatabaseService.serviceExpenses]);
    if (backupPayload.contractorName) {
      setContractorName(backupPayload.contractorName);
    }
    return res;
  };

  const getOfflineDiagnostics = () => {
    return labourDatabaseService.getOfflineDiagnostics();
  };

  const value = {
    // State
    labourers,
    workRates,
    workEntries,
    payments,
    serviceExpenses,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
    contractorName,
    setContractorName,
    isLoading,
    setIsLoading,
    error,
    setError,

    // Operations
    addLabourer,
    renameLabourer,
    toggleLabourerStatus,
    updateLabourer,
    updateWorkRate,
    resetWorkRates,
    addWorkEntry,
    updateWorkEntry,
    deleteWorkEntry,
    addPayment,
    addBulkPayments,
    updatePayment,
    deletePayment,
    addServiceExpense,
    updateServiceExpense,
    deleteServiceExpense,

    // Backup & Offline Operations (LH-QA-01)
    createBackup,
    restoreBackup,
    getOfflineDiagnostics,

    // Settlement Operations (LH-SETTLEMENT-01)
    getMonthlySettlement: getMonthlySettlementMemo,
    confirmSettlementStatus: confirmSettlementStatusMemo,
    closeMonthAndCarryForward: closeMonthAndCarryForwardMemo,
    recordSettlementCorrection: recordSettlementCorrectionMemo,
    getSettlementCorrections: getSettlementCorrectionsMemo,

    // Selectors
    todayMetrics,
    getDailyLedger,
    getMonthlySummary,
    getDailyReport,
    getWeeklyReport,
    getPaymentLedger,
    getServiceExpenseReport,
    getLabourerStatement: getLabourerStatementMemo,
    getPeriodReport: getPeriodReportMemo,
  };

  return (
    <LabourHisaabContext.Provider value={value}>
      {children}
    </LabourHisaabContext.Provider>
  );
}

export function useLabourHisaab() {
  const context = useContext(LabourHisaabContext);
  if (!context) {
    throw new Error('useLabourHisaab must be used within a LabourHisaabProvider');
  }
  return context;
}

export default LabourHisaabContext;
