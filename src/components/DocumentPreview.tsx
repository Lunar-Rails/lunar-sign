import { FileText, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface DocumentPreviewProps {
  documentName: string;
  showActions?: boolean;
}

const DocumentPreview = ({ documentName, showActions = true }: DocumentPreviewProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {showActions && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Document Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600" title="Download">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-100 p-8 min-h-[600px] flex items-center justify-center">
        <div className="bg-white shadow-lg w-full max-w-3xl mx-auto p-12 rounded-lg">
          <div className="border-b border-slate-300 pb-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{documentName}</h2>
                <p className="text-sm text-slate-600">Complyverse Document Execution Management System</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-slate-700">
            <p className="text-justify">
              <strong>EMPLOYMENT AGREEMENT</strong>
            </p>

            <p className="text-justify">
              This Employment Agreement is entered into as of the date last signed below, by and between
              <strong> Acme Corporation</strong>, a corporation organized under the laws of Delaware
              ("Company"), and <strong>Sarah Johnson</strong> ("Employee").
            </p>

            <p className="text-justify">
              <strong>1. POSITION AND DUTIES</strong>
            </p>

            <p className="text-justify">
              The Company hereby employs the Employee, and the Employee hereby accepts employment with
              the Company, upon the terms and conditions set forth in this Agreement. The Employee shall
              serve as Senior Software Developer and shall have such duties, responsibilities, and
              authority as are customarily associated with such position.
            </p>

            <p className="text-justify">
              <strong>2. COMPENSATION</strong>
            </p>

            <p className="text-justify">
              As compensation for services rendered, the Company shall pay the Employee a base salary
              at the annual rate of $120,000, payable in accordance with the Company's standard payroll
              practices. The Employee's salary shall be subject to review and adjustment from time to
              time as determined by the Company.
            </p>

            <p className="text-justify">
              <strong>3. BENEFITS</strong>
            </p>

            <p className="text-justify">
              The Employee shall be entitled to participate in all employee benefit plans, practices,
              and programs maintained by the Company, as in effect from time to time, on a basis which
              is no less favorable than that provided to other similarly situated employees of the Company.
            </p>

            <p className="text-justify">
              <strong>4. CONFIDENTIALITY AND NON-DISCLOSURE</strong>
            </p>

            <p className="text-justify">
              The Employee acknowledges that during the course of employment, they will have access to
              and become familiar with various trade secrets and proprietary information. The Employee
              agrees to maintain strict confidentiality regarding all such information both during and
              after the term of employment.
            </p>

            <div className="pt-12 mt-12 border-t border-slate-300">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Employee Signature</p>
                  <div className="border-b-2 border-slate-400 pb-2 mb-1">
                    <p className="font-signature text-2xl text-slate-800 italic">Sarah Johnson</p>
                  </div>
                  <p className="text-xs text-slate-500">Date: 2026-04-05</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-2">HR Manager Signature</p>
                  <div className="border-b-2 border-slate-400 pb-2 mb-1">
                    <p className="font-signature text-2xl text-slate-800 italic">Michael Brown</p>
                  </div>
                  <p className="text-xs text-slate-500">Date: 2026-04-05</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm text-slate-600 mb-2">Legal Counsel Signature</p>
                <div className="border-b-2 border-slate-300 pb-2 mb-1 max-w-xs">
                  <p className="text-slate-400 italic">Pending signature...</p>
                </div>
                <p className="text-xs text-slate-500">Date: _______________</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-center">
        <p className="text-xs text-slate-600">
          Page 1 of 1 | {documentName}
        </p>
      </div>
    </div>
  );
};

export default DocumentPreview;
