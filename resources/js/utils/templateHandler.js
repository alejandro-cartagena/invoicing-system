import FileSaver from 'file-saver';
import { toast } from 'react-hot-toast';

export const saveTemplate = (invoiceData) => {
    const blob = new Blob([JSON.stringify(invoiceData)], {
        type: 'text/plain;charset=utf-8',
    });
    FileSaver(blob, 'invoice.template');
};

export const handleTemplateUpload = (file, setInvoiceData) => {
    if (!file) return;

    file.text()
        .then((str) => {
            try {
                if (!(str.startsWith('{') && str.endsWith('}'))) {
                    str = atob(str);
                }
                const data = JSON.parse(str);
                setInvoiceData(data);
            } catch (e) {
                console.error(e);
                toast.error('Invalid template file');
                return;
            }
        })
        .catch((err) => {
            console.error(err);
            toast.error('Error reading template file');
        });
};
