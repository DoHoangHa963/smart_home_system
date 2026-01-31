import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Users,
  Shield,
  Home,
  Lightbulb,
  DoorOpen,
  Settings,
  BookOpen,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function Help() {
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Trung tâm Trợ giúp</h1>
          <p className="text-muted-foreground mt-1">
            Hướng dẫn sử dụng hệ thống SmartHome
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Hướng dẫn cơ bản
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tìm hiểu cách bắt đầu sử dụng hệ thống
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Quản lý quyền
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hiểu về hệ thống quyền và vai trò
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Câu hỏi thường gặp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tìm câu trả lời cho các vấn đề phổ biến
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Bắt đầu sử dụng
            </CardTitle>
            <CardDescription>
              Hướng dẫn cơ bản để bắt đầu với hệ thống SmartHome
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full">
                  1
                </Badge>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Đăng nhập hoặc Đăng ký</h4>
                  <p className="text-sm text-muted-foreground">
                    Tạo tài khoản mới hoặc đăng nhập vào hệ thống bằng email và mật khẩu của bạn.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full">
                  2
                </Badge>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Chọn hoặc Tạo nhà</h4>
                  <p className="text-sm text-muted-foreground">
                    Nếu bạn là chủ nhà, hãy tạo một ngôi nhà mới. Nếu được mời, chọn nhà mà bạn muốn quản lý.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full">
                  3
                </Badge>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Thêm thiết bị</h4>
                  <p className="text-sm text-muted-foreground">
                    Bắt đầu bằng cách thêm các thiết bị thông minh vào hệ thống và gán chúng vào các phòng.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles and Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Vai trò và Quyền hạn
            </CardTitle>
            <CardDescription>
              Hiểu về các vai trò và quyền hạn trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">OWNER</Badge>
                  <span className="text-sm font-medium">Chủ nhà</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Có toàn quyền quản lý ngôi nhà, bao gồm:
                </p>
                <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                  <li>Quản lý tất cả thiết bị và phòng</li>
                  <li>Mời và xóa thành viên</li>
                  <li>Thay đổi vai trò và quyền của thành viên</li>
                  <li>Cấu hình cài đặt nhà</li>
                  <li>Xóa nhà hoặc chuyển quyền sở hữu</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">ADMIN</Badge>
                  <span className="text-sm font-medium">Quản trị viên</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Có quyền quản lý hầu hết các chức năng, trừ:
                </p>
                <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                  <li>Quản lý thiết bị, phòng, tự động hóa, ngữ cảnh</li>
                  <li>Mời và quản lý thành viên</li>
                  <li>Cập nhật cài đặt nhà</li>
                  <li>Không thể xóa nhà hoặc chuyển quyền sở hữu</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">MEMBER</Badge>
                  <span className="text-sm font-medium">Thành viên</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quyền hạn cơ bản để sử dụng hệ thống:
                </p>
                <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                  <li>Xem thiết bị và điều khiển chúng</li>
                  <li>Xem phòng và tự động hóa</li>
                  <li>Kích hoạt ngữ cảnh</li>
                  <li>Xem danh sách thành viên</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">GUEST</Badge>
                  <span className="text-sm font-medium">Khách</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quyền xem hạn chế:
                </p>
                <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                  <li>Chỉ xem thiết bị và phòng</li>
                  <li>Xem danh sách thành viên</li>
                  <li>Không thể điều khiển thiết bị</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Hướng dẫn các tính năng
            </CardTitle>
            <CardDescription>
              Tìm hiểu cách sử dụng các tính năng chính
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="devices">
                <AccordionTrigger className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span>Quản lý Thiết bị</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-6">
                    <div>
                      <h4 className="font-semibold mb-1">Thêm thiết bị</h4>
                      <p className="text-sm text-muted-foreground">
                        Nhấn nút "Thêm thiết bị" và nhập mã thiết bị. Đảm bảo thiết bị đã được kết nối với hệ thống.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Điều khiển thiết bị</h4>
                      <p className="text-sm text-muted-foreground">
                        Sử dụng công tắc trên thẻ thiết bị để bật/tắt. Bạn cần có quyền DEVICE_CONTROL.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Chỉnh sửa và Xóa</h4>
                      <p className="text-sm text-muted-foreground">
                        Sử dụng menu "..." trên thẻ thiết bị để chỉnh sửa thông tin hoặc xóa thiết bị.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rooms">
                <AccordionTrigger className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-primary" />
                  <span>Quản lý Phòng</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-6">
                    <div>
                      <h4 className="font-semibold mb-1">Tạo phòng</h4>
                      <p className="text-sm text-muted-foreground">
                        Nhấn "Tạo phòng mới" và nhập tên phòng. Tên phòng phải là duy nhất trong ngôi nhà.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Xem chi tiết phòng</h4>
                      <p className="text-sm text-muted-foreground">
                        Nhấn vào phòng để xem danh sách thiết bị trong phòng và quản lý chúng.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Thêm thiết bị vào phòng</h4>
                      <p className="text-sm text-muted-foreground">
                        Từ trang chi tiết phòng, nhấn "Thêm thiết bị" và chọn thiết bị từ danh sách.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="members">
                <AccordionTrigger className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Quản lý Thành viên</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-6">
                    <div>
                      <h4 className="font-semibold mb-1">Mời thành viên</h4>
                      <p className="text-sm text-muted-foreground">
                        Nhấn "Mời thành viên" và nhập email của người bạn muốn mời. Chọn vai trò cho họ.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Thay đổi vai trò</h4>
                      <p className="text-sm text-muted-foreground">
                        Từ menu "..." của thành viên, chọn "Đổi vai trò" để thay đổi vai trò của họ.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Quản lý quyền</h4>
                      <p className="text-sm text-muted-foreground">
                        Chủ nhà có thể chọn "Quản lý quyền" để cấp hoặc thu hồi các quyền cụ thể cho từng thành viên.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Xóa thành viên</h4>
                      <p className="text-sm text-muted-foreground">
                        Chọn "Xóa khỏi nhà" để loại bỏ thành viên khỏi ngôi nhà.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Câu hỏi thường gặp
            </CardTitle>
            <CardDescription>
              Tìm câu trả lời cho các vấn đề phổ biến
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger>
                  Tôi không thể thấy một số tính năng. Tại sao?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Một số tính năng được ẩn dựa trên quyền hạn và vai trò của bạn. Nếu bạn không thấy một nút hoặc menu,
                    có thể bạn chưa có quyền để sử dụng tính năng đó. Hãy liên hệ với chủ nhà để được cấp quyền phù hợp.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger>
                  Làm thế nào để thêm thiết bị mới vào hệ thống?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Để thêm thiết bị mới:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-4">
                    <li>Đảm bảo thiết bị đã được kết nối với mạng và đã được đăng ký trong hệ thống</li>
                    <li>Nhấn nút "Thêm thiết bị" trên trang Quản lý Thiết bị</li>
                    <li>Nhập mã thiết bị (device code) được cung cấp</li>
                    <li>Chọn loại thiết bị và phòng mà bạn muốn gán</li>
                    <li>Nhấn "Thêm" để hoàn tất</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger>
                  Tôi có thể thay đổi quyền của chính mình không?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Không, bạn không thể tự thay đổi quyền của chính mình. Chỉ có chủ nhà (OWNER) mới có thể
                    thay đổi vai trò và quyền hạn của các thành viên khác. Nếu bạn cần quyền bổ sung, hãy liên hệ với chủ nhà.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4">
                <AccordionTrigger>
                  Làm sao để rời khỏi một ngôi nhà?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Nếu bạn không còn muốn là thành viên của một ngôi nhà, bạn có thể yêu cầu chủ nhà xóa bạn khỏi danh sách thành viên.
                    Lưu ý: Chủ nhà không thể tự xóa mình khỏi nhà. Nếu muốn chuyển quyền sở hữu, hãy sử dụng tính năng "Chuyển quyền sở hữu".
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-5">
                <AccordionTrigger>
                  Thiết bị của tôi không phản hồi. Tôi nên làm gì?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Nếu thiết bị không phản hồi, hãy thử các bước sau:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground pl-4">
                    <li>Kiểm tra kết nối mạng của thiết bị</li>
                    <li>Đảm bảo thiết bị đang ở trạng thái hoạt động (ONLINE)</li>
                    <li>Thử làm mới trang để cập nhật trạng thái mới nhất</li>
                    <li>Kiểm tra xem bạn có quyền điều khiển thiết bị không</li>
                    <li>Nếu vấn đề vẫn tiếp tục, hãy liên hệ với chủ nhà hoặc quản trị viên</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact & Support */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Cần hỗ trợ thêm?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Nếu bạn không tìm thấy câu trả lời trong tài liệu này, vui lòng liên hệ với chủ nhà hoặc quản trị viên hệ thống.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Đối với các vấn đề kỹ thuật, vui lòng liên hệ với đội ngũ hỗ trợ kỹ thuật.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
