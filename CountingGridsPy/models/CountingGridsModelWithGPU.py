#https://github.com/feedly/ml-demos/blob/master/source/gpu.py#L42

import torch

import torch.nn as nn

import torch.nn.functional as F

from torchvision import datasets

from torch.utils.data import DataLoader

import numpy as np

import time

from tqdm import tqdm


class Model(nn.Module):

    def __init__(self):

        super(Model, self).__init__()

        self.hidden = nn.Linear(784, 50)

        self.final = nn.Linear(50, 10)



    def forward(self, features):

        x = self.hidden(features.float().view(len(features), -1))

        x = self.final(x)

        return F.log_softmax(x, dim=1)



def fun_with_gpus():

    t1 = torch.cuda.FloatTensor(20,20)

    t2 = torch.cuda.FloatTensor(20,20)

    t3 = t1.matmul(t2)

    print(f"What is t3? Well it's a {type(t3)}")



def this_wont_work_dummy(features, labels):

    dl = DataLoader(list(zip(features, labels)), batch_size=5)

    model = Model()

    model.hidden.cuda()



    batch = next(iter(dl))

    batch = [torch.autograd.Variable(b) for b in batch]

    return model.forward(*batch[:-1])





def view_number(data:torch.FloatTensor, title:str):

    import matplotlib.pyplot as plt

    plt.imshow(data.numpy())

    plt.title(title)

    plt.show()



def data_shipping_experiment(n:int):

    #let's run all on the CPU

    array1 = np.random.randn(200,200)

    array2 = np.random.randn(200,200)

    t0 = time.time()

    for i in range(n):

        array3 = array1.dot(array2)

        array1 = array3

    t1 = time.time()



    print(f'CPU only operations took {t1-t0}')





    #let's run all on the GPU

    tensor1 = torch.cuda.FloatTensor(200, 200)

    tensor2 = torch.cuda.FloatTensor(200, 200)



    t0 = time.time()

    for i in range(n):

        tensor3 = tensor1.matmul(tensor2)

        del tensor1

        tensor1 = tensor3

    t1 = time.time()



    print(f'GPU only operations took {t1-t0}')



    #let's ship data like a mofo

    tensor1 = torch.FloatTensor(200, 200)

    tensor2 = torch.FloatTensor(200, 200)



    t0 = time.time()

    for i in range(n):

        ctensor1 = tensor1.cuda()

        ctensor2 = tensor2.cuda()

        ctensor3 = ctensor1.matmul(ctensor2)

        tensor1 = ctensor3.cpu()



        del ctensor1

        del ctensor2

        del ctensor3



    t1 = time.time()



    print(f'data shipping took {t1-t0}')



def data_shipping_experiment_addition(n:int):
    SIZE = 600

    #let's run all on the CPU

    array1 = np.random.randn(SIZE,SIZE)

    array2 = np.random.randn(SIZE,SIZE)

    t0 = time.time()

    for i in range(n):

        array3 = array1 + array2

        array1 = array3

    t1 = time.time()



    print(f'CPU only operations took {t1-t0}')





    #let's run all on the GPU

    tensor1 = torch.cuda.FloatTensor(SIZE,SIZE)

    tensor2 = torch.cuda.FloatTensor(SIZE,SIZE)



    t0 = time.time()

    for i in range(n):

        tensor3 = tensor1 + tensor2

        del tensor1

        tensor1 = tensor3

    t1 = time.time()



    print(f'GPU only operations took {t1-t0}')


    '''
    #let's ship data like a mofo

    tensor1 = torch.FloatTensor(200, 200)

    tensor2 = torch.FloatTensor(200, 200)



    t0 = time.time()

    for i in range(n):

        ctensor1 = tensor1.cuda()

        ctensor2 = tensor2.cuda()

        ctensor3 = ctensor1 +ctensor2

        tensor1 = ctensor3.cpu()



        del ctensor1

        del ctensor2

        del ctensor3



    t1 = time.time()



    print(f'data shipping took {t1-t0}')
    '''

def caching_transpose(n:int):
    SIZE1 = 6000
    SIZE2 = 2000
    E1 = 40
    E2 = 40
    L = np.prod(E2*E1)

    data = np.abs(np.random.randn(SIZE1,SIZE2)) + 3
    h = np.abs(np.random.randn(E1,E2,SIZE2)) + 3


    t0 = time.time()
    trans = np.transpose(data)
    for i in range(n):
        lql = np.dot(np.log(h).reshape((L,data.shape[1])) , trans)
        h = h + 1

    t1 = time.time()
    print(f'CPU cache_transpose took {t1-t0} seconds')


    
    t0 = time.time()

    for i in range(n):
        lql = np.dot(np.log(h).reshape((L,data.shape[1])) , np.transpose(data))
        #data = data + 1
        h = h + 1

    t1 = time.time()
    print(f'CPU no_cache_transpose took {t1-t0} seconds')

'''
Let's store q as E1xE2xT. It makes it consistent with pi, and I freaked out because I thought I had a bug 
in the production code.

I will need to modify the file writer as a consequence to docmap.txt.
'''




class CountingGridModelWithGPU(object):
    def __init__(self,extent,window):
        '''
        Assumes:
        extent is a 1-D numpy array of size D.
        window is a 1-D numpy array of size D.

        D is often 2, since it makes the model easily visualizable.
        '''
        self.extent = torch.cuda.FloatTensor(extent)
        self.window = torch.cuda.FloatTensor(window)

    #Has same numpy API - no need to change.
    def compute_h_noLoopFull(self,PI,w0,w1):
        '''
        Critical method for computing the histogram using the pi parameters.

        Potential optimization to remove this function to reduce an extra stack frame.
        '''
        return PI[w0:,w1:,:] - PI[:-w0,w1:,:] - PI[w0:,:-w1,:] + PI[:-w0,:-w1,:]

    def compute_h(self,pi,W):
        '''
        Compute the histogram.
        '''
        #optimization is to do this without moving any data back to the cpu to do the padding
        PI = np.pad(pi.numpy(), [(0,W[0]),(0,W[1]),(0,0)], 'wrap')
        PI = torch.from_numpy(np.pad(PI,[(1,0),(1,0),(0,0)],'constant')).cumsum(0).cumsum(1).cuda()
        cumsum_output = self.compute_h_noLoopFull(PI,W[0],W[1])
        return ( (cumsum_output[:-1,:-1,:]).permute((2,0,1)) / cumsum_output[:-1,:-1,:].sum(dim=2) ).permute((1,2,0))   

    def q_update(self,data):
        '''
        Updates belief of where document should be mapped.
        '''
        L= torch.prod(self.extent)
        lql = torch.dot(
            torch.log(self.h).reshape((L,data.shape[1])),
            torch.transpose(data,1,0) #this transpose is fine - just flipping axes
        ) 
        lqlmax = torch.max(lql,0)[0]
        min_prob = 1.0/(10*L)
        Lq = (
            (lql-lqlmax) - torch.log( torch.sum(torch.exp(lql-lqlmax),0))
        ).reshape(tuple(list(self.extent) + [data.shape[0]]))
        q = torch.exp(Lq)
        q[ q< min_prob ] = min_prob;   q = q /torch.sum( torch.sum(q,0),0)
        return q

    def pi_update(self,data,pseudocounts,alpha):
        T,Z = data.shape
        W = self.window
        #QdotC is called nrm in matlab engine, but padding is done beforehand in matlab
       
       
        # self.permute([1,2,0])
        # [x,y,z] => [y,z,x]
    
        QdotC = torch.dot(
            self.q.permute([1,2,0]),
            data
        )
        
        # PyTorch only implements circular padding for 1 dimension at a time.
        # We will pass the data back to the CPU, do the padding, and bring it back to the GPU.abs
        
        
        QH = np.pad(
            (QdotC/(self.h + torch.prod(self.window)*alpha)).cpu().numpy(),
            [(W[0],0),(W[1],0),(0,0)],
            'wrap'
        ).cumsum(axis=0).cumsum(axis=1)
        QH = torch.cuda.FloatTensor(QH)
        
        w0 = W[0]; w1 = W[1]
        QH = self.compute_h_noLoopFull(QH,w0,w1)
        QH[QH<0] = 0
        
        un_pi = pseudocounts + QH*(self.pi+alpha)
        mask = (torch.sum(un_pi,axis=2)!=0).double()
        not_mask = (torch.sum(un_pi,axis=2)==0).double()
    
        denom = torch.sum(un_pi,axis=2)
        '''
        self.pi = np.transpose( np.transpose(mask)*(np.transpose(un_pi) / np.transpose(denom) )) + \
        (1.0/Z)* np.transpose(np.transpose(np.ones([self.extent[0],self.extent[1],Z]))*np.transpose(not_mask))
        return self.pi
        '''

    def fit_gpu(self,data_cpu,max_iter=100,noise=.000001,learn_pi=True,pi=None,layers=1,output_directory="./", heartBeaters = None):
        '''
        Fits the model, using GPU.

        Assumes:
        1. pi is a torch tensor on the GPU
        '''
    
        if not os.path.exists(str(output_directory)):
            raise Exception("output_directory does not exist for counting grids trainer.")

        if not torch.cuda.is_available():
            raise Exception("No GPU available for training.")
        device = torch.device("cuda")
        alpha = 1e-10
        data = torch.tensor(data_cpu,device = device,dtype=torch.double)

        if pi is None:
            self.initializePi(data) #optimize by just initializing it in GPU memory and moving the torch tensor code to the else
        else:
            self.pi = pi
            
        self.pi = torch.tensor(self.pi,device=device,dtype=torch.double)
        self.h = self.compute_h(self.pi,self.window)
        P = torch.prod(self.extent)
        T,Z = data.size()
        
        pseudocounts =  torch.mean(data.sum(1) / P )  / 2.5
        # q is an m x dim(extent) structure
        qshape =[len(data)]
        for v in self.extent:
            qshape.append(v)
        self.q = torch.zeros(tuple(qshape))
    
        for i in tqdm(range(max_iter)):    
            #E-Step 
            self.q = self.q_update(data)
        '''
            #M-Step
            if learn_pi:
                self.pi = self.pi_update(data,pseudocounts,alpha)
                self.h = self.compute_h(self.pi,self.window)
            [ (h.makeProgress(int(100*i/max_iter) ) if h!=None else False) for h in heartBeaters ] if heartBeaters != None else False

        if layers > 1:
            self.layercgdata = self.cg_layers(data,L=layers,noise = noise)
            scipy.io.savemat(str(output_directory) + "/CountingGridDataMatrices.mat",self.layercgdata)
            #return self.layercgdata
        else:
            scipy.io.savemat(str(output_directory) + "/CGData.mat",{"pi":self.pi,"q":self.q})
        if returnSumSquareDifferencesOfPi:
            pass
        return self.pi
        '''

def gpu_experiment_estep(n:int):
    SIZE1 = 6000
    SIZE2 = 20000
    E1 = 40
    E2 = 40
    L = np.prod(E2*E1)
    #let's run all on the CPU

    data = np.abs(np.random.randn(SIZE1,SIZE2)) + 3
    h = np.abs(np.random.randn(E1,E2,SIZE2)) + 3


    t0 = time.time()

    for i in range(n):
        lql = np.dot(np.log(h).reshape((L,data.shape[1])) , np.transpose(data))
        #data = data + 1
        #h = h + 1

    t1 = time.time()



    print(f'CPU only operations took {t1-t0} seconds')





    #let's run all on the GPU

    data = torch.from_numpy( np.abs(np.random.randn(SIZE1,SIZE2))).cuda() + 3
    h = torch.from_numpy( np.abs(np.random.randn(E1,E2,SIZE2))).cuda() + 3
    
    ones_data = torch.from_numpy(np.ones((SIZE1,SIZE2))).cuda()
    ones_h = torch.from_numpy(np.ones((E1,E2,SIZE2))).cuda()



    t0 = time.time()
    
    for i in range(n):

        lql = h.log().reshape((L,-1)).matmul(data.transpose(1,0))

        #data = data + ones_data
        #h = h + ones_h

    t1 = time.time()



    print(f'GPU only operations took {t1-t0} seconds.')



'''
Plan - implement vanilla counting grids using PyTorch API.

'''





if __name__ == '__main__':

    if not torch.cuda.is_available():

        raise ValueError('a GPU is required for these examples')



    #data_shipping_experiment_addition(100000)

    caching_transpose(10)