import RFIDManager from '@/components/rfid/RFIDManager';

export default function RFID() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý thẻ RFID</h1>
        <p className="text-muted-foreground mt-2">
          Học thẻ mới, quản lý danh sách thẻ và xem lịch sử truy cập
        </p>
      </div>
      <RFIDManager />
    </div>
  );
}
