import XCTest
@testable import Robin

final class RobinNavigationTests: XCTestCase {
    func testNoticeRouteUsesAllowListedProductAndUUID() throws {
        let id = "2F8866C5-14E0-4D5D-82C9-EDAC26D6B4D1"
        let url = try XCTUnwrap(RobinProduct.community.noticeURL(id: id, origin: URL(string: "https://project-robin.com")!))
        XCTAssertEqual(url.path, "/therobinplan/")
        XCTAssertEqual(URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first?.value, id)
        XCTAssertNil(RobinProduct.community.noticeURL(id: "javascript:alert(1)", origin: URL(string: "https://project-robin.com")!))
    }

    func testUnknownPushProductCannotBeMapped() {
        XCTAssertNil(RobinProduct(rawValue: "https://example.com"))
    }

    func testNativeSummaryKeepsOnlySafeFieldsAndRequiresUUID() throws {
        let id = "2F8866C5-14E0-4D5D-82C9-EDAC26D6B4D1"
        let json = """
        {"notifications":[
          {"id":"\(id)","title":"Aviso","content":"contenido privado","type":"general","status":"pending","created_at":"2026-11-27T09:30:00.000Z"},
          {"id":"malformed","title":"Ignorar","created_at":"2026-11-27T09:30:00.000Z"}
        ]}
        """.data(using: .utf8)!
        let notices = RobinNotice.summaries(from: json, product: .portal)
        XCTAssertEqual(notices.count, 1)
        XCTAssertEqual(notices.first?.id, id)
        XCTAssertEqual(notices.first?.status, "pending")
        XCTAssertEqual(notices.first?.title, "Aviso")
    }
}
