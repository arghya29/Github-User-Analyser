import { fetchUserData } from '../github'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('fetchUserData', () => {
  it('should return user data on success', async () => {
    const mockData = { username: 'testuser' }
    mockedAxios.get.mockResolvedValueOnce({ data: mockData })
    
    const result = await fetchUserData('testuser')
    expect(result).toEqual(mockData)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/github?username=testuser',
      expect.any(Object)
    )
  })
})
