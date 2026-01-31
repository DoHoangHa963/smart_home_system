export const calculateHomeCounts = async (home: any, homeStore: any) => {
  try {
    // Fetch members và rooms cho home này
    const [membersResponse, roomsResponse] = await Promise.all([
      homeStore.fetchHomeMembers(home.id),
      homeStore.fetchHomeRooms(home.id) // Cần tạo API này nếu chưa có
    ]);
    
    return {
      ...home,
      memberCount: membersResponse?.data?.length || 0,
      roomCount: roomsResponse?.data?.length || 0
    };
  } catch (error) {
    console.error(`Error calculating counts for home ${home.id}:`, error);
    return {
      ...home,
      memberCount: 0,
      roomCount: 0
    };
  }
};