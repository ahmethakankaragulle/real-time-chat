import { Client } from '@elastic/elasticsearch';
import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/elasticsearch.log' })
    ]
});

class ElasticsearchService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.indexName = 'messages';
        this.userIndexName = 'users';
    }

    // elasticsearch bağlantısını kur   
    async connect() {
        try {
            this.client = new Client({
                node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
                auth: {
                    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
                    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // bağlantıyı test et
            await this.client.ping();
            this.isConnected = true;

            logger.info('Elasticsearch bağlantısı başarılı');

            // indeksleri oluştur
            await this.createIndices();

            return true;
        } catch (error) {
            logger.error('Elasticsearch bağlantı hatası:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // indeksleri oluştur
    async createIndices() {
        try {
            // mesajlar için indeks
            const messageIndexExists = await this.client.indices.exists({
                index: this.indexName
            });

            if (!messageIndexExists) {
                await this.client.indices.create({
                    index: this.indexName,
                    body: {
                        settings: {
                            analysis: {
                                analyzer: {
                                    turkish_analyzer: {
                                        type: 'custom',
                                        tokenizer: 'standard',
                                        filter: ['lowercase']
                                    }
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            content: {
                                type: 'text',
                                analyzer: 'turkish_analyzer',
                                search_analyzer: 'turkish_analyzer',
                                fields: {
                                    keyword: {
                                        type: 'keyword',
                                        ignore_above: 256
                                    }
                                }
                            },
                            senderId: {
                                type: 'keyword'
                            },
                            receiverId: {
                                type: 'keyword'
                            },
                            conversationId: {
                                type: 'keyword'
                            },
                            isRead: {
                                type: 'boolean'
                            },
                            createdAt: {
                                type: 'date'
                            },
                            updatedAt: {
                                type: 'date'
                            },
                            senderUsername: {
                                type: 'text',
                                analyzer: 'turkish_analyzer'
                            },
                            receiverUsername: {
                                type: 'text',
                                analyzer: 'turkish_analyzer'
                            }
                        }
                    }
                });

                logger.info(`Mesaj indeksi oluşturuldu: ${this.indexName}`);
            }

            // kullanıcılar için indeks
            const userIndexExists = await this.client.indices.exists({
                index: this.userIndexName
            });

            if (!userIndexExists) {
                await this.client.indices.create({
                    index: this.userIndexName,
                    body: {
                        settings: {
                            analysis: {
                                analyzer: {
                                    turkish_analyzer: {
                                        type: 'custom',
                                        tokenizer: 'standard',
                                        filter: ['lowercase']
                                    }
                                }
                            }
                        }
                    },
                    mappings: {
                        properties: {
                            username: {
                                type: 'text',
                                analyzer: 'turkish_analyzer',
                                fields: {
                                    keyword: {
                                        type: 'keyword',
                                        ignore_above: 256
                                    }
                                },
                                fielddata: true
                            },
                            email: {
                                type: 'keyword'
                            },
                            firstName: {
                                type: 'text',
                                analyzer: 'turkish_analyzer',
                                fielddata: true
                            },
                            lastName: {
                                type: 'text',
                                analyzer: 'turkish_analyzer',
                                fielddata: true
                            },
                            isActive: {
                                type: 'boolean'
                            },
                            lastSeen: {
                                type: 'date'
                            },
                            createdAt: {
                                type: 'date'
                            },
                            updatedAt: {
                                type: 'date'
                            }
                        }
                    }
                });

                logger.info(`Kullanıcı indeksi oluşturuldu: ${this.userIndexName}`);
            }

        } catch (error) {
            logger.error('İndeks oluşturma hatası:', error);
            throw error;
        }
    }

    // mesaj indeksle
    async indexMessage(messageData) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            const document = {
                content: messageData.content,
                senderId: messageData.senderId ? messageData.senderId.toString() : null,
                receiverId: messageData.receiverId ? messageData.receiverId.toString() : null,
                conversationId: messageData.conversationId ? messageData.conversationId.toString() : null,
                isRead: messageData.isRead || false,
                createdAt: messageData.createdAt,
                updatedAt: messageData.updatedAt,
                senderUsername: messageData.senderUsername || '',
                receiverUsername: messageData.receiverUsername || ''
            };

            await this.client.index({
                index: this.indexName,
                id: messageData._id.toString(),
                body: document
            });

            logger.info(`Mesaj indekslendi: ${messageData._id}`);
            return true;
        } catch (error) {
            logger.error(`Mesaj indeksleme hatası (${messageData._id}):`, error);
            throw error;
        }
    }

    // kullanıcı indeksle
    async indexUser(userData) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            const document = {
                username: userData.username,
                email: userData.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                isActive: userData.isActive || false,
                lastSeen: userData.lastSeen,
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt
            };

            await this.client.index({
                index: this.userIndexName,
                id: userData._id.toString(),
                body: document
            });

            logger.info(`Kullanıcı indekslendi: ${userData._id}`);
            return true;
        } catch (error) {
            logger.error(`Kullanıcı indeksleme hatası (${userData._id}):`, error);
            throw error;
        }
    }

    // mesaj ara
    async searchMessages(query, options = {}) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            const {
                userId,
                conversationId,
                fromDate,
                toDate,
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const from = (page - 1) * limit;
            const size = limit;

            // arama sorgusu oluştur
            const searchQuery = {
                bool: {
                    must: [
                        {
                            multi_match: {
                                query: query,
                                fields: ['content^2', 'senderUsername', 'receiverUsername'],
                                type: 'best_fields',
                                fuzziness: 'AUTO'
                            }
                        }
                    ],
                    filter: []
                }
            };

            // filtrelerİ ekle
            if (userId) {
                searchQuery.bool.filter.push({
                    bool: {
                        should: [
                            { term: { senderId: userId } },
                            { term: { receiverId: userId } }
                        ]
                    }
                });
            }

            if (conversationId) {
                searchQuery.bool.filter.push({
                    term: { conversationId: conversationId }
                });
            }

            if (fromDate || toDate) {
                const dateFilter = { range: { createdAt: {} } };
                if (fromDate) dateFilter.range.createdAt.gte = fromDate;
                if (toDate) dateFilter.range.createdAt.lte = toDate;
                searchQuery.bool.filter.push(dateFilter);
            }

            const response = await this.client.search({
                index: this.indexName,
                body: {
                    query: searchQuery,
                    sort: [
                        { [sortBy]: { order: sortOrder } }
                    ],
                    from: from,
                    size: size,
                    highlight: {
                        fields: {
                            content: {
                                pre_tags: ['<mark>'],
                                post_tags: ['</mark>'],
                                fragment_size: 150,
                                number_of_fragments: 3
                            }
                        }
                    }
                }
            });

            const results = {
                hits: response.hits.hits.map(hit => ({
                    _id: hit._id,
                    _score: hit._score,
                    ...hit._source,
                    highlights: hit.highlight
                })),
                total: response.hits.total.value,
                page: page,
                limit: limit,
                totalPages: Math.ceil(response.hits.total.value / limit)
            };

            logger.info(`Mesaj arama tamamlandı: ${results.total} sonuç bulundu`);
            return results;

        } catch (error) {
            logger.error('Mesaj arama hatası:', error);
            throw error;
        }
    }

    // kullanıcı ara
    async searchUsers(query, options = {}) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            const {
                isActive,
                page = 1,
                limit = 20,
                sortBy = 'username',
                sortOrder = 'asc'
            } = options;

            const from = (page - 1) * limit;
            const size = limit;

            const searchQuery = {
                bool: {
                    must: [
                        {
                            multi_match: {
                                query: query,
                                fields: ['username^2', 'firstName', 'lastName', 'email'],
                                type: 'best_fields',
                                fuzziness: 'AUTO'
                            }
                        }
                    ],
                    filter: []
                }
            };

            if (isActive !== undefined) {
                searchQuery.bool.filter.push({
                    term: { isActive: isActive }
                });
            }

            const response = await this.client.search({
                index: this.userIndexName,
                body: {
                    query: searchQuery,
                    from: from,
                    size: size,
                    highlight: {
                        fields: {
                            username: {
                                pre_tags: ['<mark>'],
                                post_tags: ['</mark>']
                            },
                            firstName: {
                                pre_tags: ['<mark>'],
                                post_tags: ['</mark>']
                            },
                            lastName: {
                                pre_tags: ['<mark>'],
                                post_tags: ['</mark>']
                            }
                        }
                    }
                }
            });

            const results = {
                hits: response.hits.hits.map(hit => ({
                    _id: hit._id,
                    _score: hit._score,
                    ...hit._source,
                    highlights: hit.highlight
                })),
                total: response.hits.total.value,
                page: page,
                limit: limit,
                totalPages: Math.ceil(response.hits.total.value / limit)
            };

            logger.info(`Kullanıcı arama tamamlandı: ${results.total} sonuç bulundu`);
            return results;

        } catch (error) {
            logger.error('Kullanıcı arama hatası:', error);
            throw error;
        }
    }

    // mesaj güncelle
    async updateMessage(messageId, updateData) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            await this.client.update({
                index: this.indexName,
                id: messageId,
                body: {
                    doc: updateData
                }
            });

            logger.info(`Mesaj güncellendi: ${messageId}`);
            return true;
        } catch (error) {
            logger.error(`Mesaj güncelleme hatası (${messageId}):`, error);
            throw error;
        }
    }

    // kullanıcı güncelle
    async updateUser(userId, updateData) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            await this.client.update({
                index: this.userIndexName,
                id: userId,
                body: {
                    doc: updateData
                }
            });

            logger.info(`Kullanıcı güncellendi: ${userId}`);
            return true;
        } catch (error) {
            logger.error(`Kullanıcı güncelleme hatası (${userId}):`, error);
            throw error;
        }
    }

    // mesaj sil
    async deleteMessage(messageId) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            await this.client.delete({
                index: this.indexName,
                id: messageId
            });

            logger.info(`Mesaj silindi: ${messageId}`);
            return true;
        } catch (error) {
            logger.error(`Mesaj silme hatası (${messageId}):`, error);
            throw error;
        }
    }

    // kullanıcı sil
    async deleteUser(userId) {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            await this.client.delete({
                index: this.userIndexName,
                id: userId
            });

            logger.info(`Kullanıcı silindi: ${userId}`);
            return true;
        } catch (error) {
            logger.error(`Kullanıcı silme hatası (${userId}):`, error);
            throw error;
        }
    }

    // indeksleri yeniden oluştur (tüm verileri sil ve yeniden indeksle)
    async reindexAll() {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            logger.info('Tüm indeksler yeniden oluşturuluyor...');

            // mevcut indeksleri sil
            await this.client.indices.delete({
                index: [this.indexName, this.userIndexName],
                ignore_unavailable: true
            });

            // indeksleri yeniden oluştur
            await this.createIndices();

            logger.info('İndeksler yeniden oluşturuldu');
            return true;
        } catch (error) {
            logger.error('İndeks yeniden oluşturma hatası:', error);
            throw error;
        }
    }

    // istatistikler
    async getStats() {
        try {
            if (!this.isConnected) {
                throw new Error('Elasticsearch bağlantısı yok');
            }

            const messageStats = await this.client.count({
                index: this.indexName
            });

            const userStats = await this.client.count({
                index: this.userIndexName
            });

            const indicesStats = await this.client.indices.stats({
                index: [this.indexName, this.userIndexName]
            });

            return {
                messages: {
                    total: messageStats.count,
                    indexSize: indicesStats.indices[this.indexName]?.total?.store?.size_in_bytes || 0
                },
                users: {
                    total: userStats.count,
                    indexSize: indicesStats.indices[this.userIndexName]?.total?.store?.size_in_bytes || 0
                },
                isConnected: this.isConnected
            };
        } catch (error) {
            logger.error('İstatistik alma hatası:', error);
            throw error;
        }
    }

    // bağlantıyı kapat
    async disconnect() {
        try {
            if (this.client) {
                await this.client.close();
                this.isConnected = false;
                logger.info('Elasticsearch bağlantısı kapatıldı');
            }
        } catch (error) {
            logger.error('Elasticsearch bağlantı kapatma hatası:', error);
        }
    }
}

export default new ElasticsearchService(); 