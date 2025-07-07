import AutoMessage from '../models/autoMessage.model.js';

class AutoMessageService {
  // otomatik mesajları listeler
  async getAutoMessages(options = {}) {
    const {
      page = 1,
      limit = 10,
      senderId,
      receiverId,
      isQueued,
      isSent,
      startDate,
      endDate,
      sortBy = 'sendDate',
      sortOrder = 'asc'
    } = options;

    // filtreleme
    const filter = {};
    
    if (senderId) filter.senderId = senderId;
    if (receiverId) filter.receiverId = receiverId;
    if (isQueued !== undefined) filter.isQueued = isQueued;
    if (isSent !== undefined) filter.isSent = isSent;
    
    if (startDate || endDate) {
      filter.sendDate = {};
      if (startDate) filter.sendDate.$gte = new Date(startDate);
      if (endDate) filter.sendDate.$lte = new Date(endDate);
    }

    // sıralama
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // pagination
    const skip = (page - 1) * limit;

    try {
      const [autoMessages, total] = await Promise.all([
        AutoMessage.find(filter)
          .populate('senderId', 'username email')
          .populate('receiverId', 'username email')
          .populate('conversationId', 'title')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        AutoMessage.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        autoMessages,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Otomatik mesajlar listelenirken hata oluştu: ${error.message}`);
    }
  }

  // belirli bir otomatik mesajı ID ile getir
  async getAutoMessageById(autoMessageId) {
    try {
      const autoMessage = await AutoMessage.findById(autoMessageId)
        .populate('senderId', 'username email')
        .populate('receiverId', 'username email')
        .populate('conversationId', 'title')
        .populate('messageId', 'content sentAt')
        .lean();

      if (!autoMessage) {
        throw new Error('Otomatik mesaj bulunamadı');
      }

      return autoMessage;
    } catch (error) {
      throw new Error(`Otomatik mesaj getirilirken hata oluştu: ${error.message}`);
    }
  }

  // kullanıcının otomatik mesajlarını getir
  async getUserAutoMessages(userId, options = {}) {
    const filterOptions = {
      ...options,
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    return this.getAutoMessages(filterOptions);
  }

  // otomatik mesaj istatistiklerini getir
  async getAutoMessageStatistics() {
    try {
      const [
        totalCount,
        queuedCount,
        sentCount,
        pendingCount,
        todayCount,
        thisWeekCount
      ] = await Promise.all([
        AutoMessage.countDocuments(),
        AutoMessage.countDocuments({ isQueued: true, isSent: false }),
        AutoMessage.countDocuments({ isSent: true }),
        AutoMessage.countDocuments({ isQueued: false, isSent: false }),
        AutoMessage.countDocuments({
          sendDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }),
        AutoMessage.countDocuments({
          sendDate: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        })
      ]);

      return {
        total: totalCount,
        queued: queuedCount,
        sent: sentCount,
        pending: pendingCount,
        today: todayCount,
        thisWeek: thisWeekCount
      };
    } catch (error) {
      throw new Error(`İstatistikler alınırken hata oluştu: ${error.message}`);
    }
  }
}

export default new AutoMessageService(); 