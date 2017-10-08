export default `
    
    type Subscription {
        userAdded: User!
    }
    
    type Suggestion {
        id: Int!
        text: String!
        creator: User!
    }
    
    type Board {
        id: Int!
        name: String!
        suggestions: [Suggestion!]!
        owner: User!
    }
    
    type User {
        id: Int!
        username: String
        createdAt: String!
        updatedAt: String!
        boards: [Board!]!
        suggestions: [Suggestion!]!
        isAdmin: Boolean!
    }
    
    type AuthPayload {
       token: String!
       refreshToken: String!
    }
    
    type Author {
        id: Int!
        firstname: String!
        lastname: String!
        primary: Boolean
        books: [Book!]!
    }
    type Book {
        id: Int!
        title: String!
        authors: [Author!]!
    }
    
    input Upload {
        name: String!
        type: String!
        size: Int!
        path: String!
    }

    type Query {
        dummy: String!
        getBook(id: Int!): Book
        allBooks(key: Int!, limit: Int!): [Book!]!
        allAuthors: [Author]!
        allUsers: [User!]!
        me: User
        userBoards(owner: Int!): [Board!]!
        userSuggestions(creatorId: String!): [Suggestion!]!
        suggestions(limit: Int!, offset: Int!): [Suggestion!]!
    }
    
    type Mutation {
        createAuthor(firstname: String!, lastname: String!): Author!
        createBook(title: String!): Book!
        addBookAuthor(bookId: Int!, authorId: Int!, primary: Boolean!): Boolean!
        createUser(username: String!): User
        updateUser(username: String!, newUsername: String!): [Int!]!
        deleteUser(username: String!): Int!
        createBoard(owner: Int!, name: String!): Board!
        createSuggestion(creatorId: Int!, text: String!, boardId: Int!): Suggestion!
        register(username: String!, email: String!, password: String!, isAdmin: Boolean): User!
        login(email: String!, password: String!): AuthPayload!
        refreshTokens(token: String!, refreshToken: String!): AuthPayload!
        uploadFile(file: Upload!): Boolean!
    }
    
    schema {
        query: Query
        mutation: Mutation
        subscription: Subscription
    }
`;