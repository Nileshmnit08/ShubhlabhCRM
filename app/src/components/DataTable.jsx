import React from 'react';

export default function DataTable({ 
  columns, 
  data, 
  theadClassName = "bg-slate-50", 
  tbodyClassName = "divide-y divide-base", 
  rowClassName = "" 
}) {
  return (
    <div className="data-table-container overflow-x-auto">
      <table className="data-table mobile-cards-table w-full">
        <thead className={theadClassName}>
          <tr>
            {columns.map((col) => (
              <th 
                key={col.id} 
                className={`px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.width || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tbodyClassName}>
          {data.map((row, rowIndex) => {
             const customRowClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
             return (
               <tr key={row.id || rowIndex} className={`hover:bg-slate-50/80 transition-colors group ${customRowClass}`}>
                 {columns.map((col) => (
                   <td 
                     key={col.id} 
                     data-label={col.header} 
                     className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                   >
                     {col.renderCell(row)}
                   </td>
                 ))}
               </tr>
             );
          })}
        </tbody>
      </table>
    </div>
  );
}
